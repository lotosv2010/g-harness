// runDeepAgent：Deep Agent 主入口（v0.2.0）—— 永不抛错，失败一律转降级。

import { loadDeepAgentDeps } from './lazy-import.js'
import { buildDeepAgent } from './agent-factory.js'
import { CostTracker } from './guards/cost-tracker.js'
import { StepLimiter } from './guards/step-limiter.js'
import { TimeoutGuard } from './guards/timeout.js'
import { TraceWriter, createRunId } from './trace/trace-writer.js'
import {
  DEFAULT_MODELS,
  DEPTH_PROFILES,
  PROVIDER_REGISTRY,
  detectDefaultProvider,
  inferProviderFromModel,
  readProviderEnv,
} from './config.js'
import { buildFallback, classifyError } from './fallback.js'
import { computeOutputWhitelist } from './prompts/system-prompt.js'
import { assertPathSafe } from './tools/security.js'
import type {
  AgentProvider,
  AgentStepEvent,
  DeepAgentOptions,
  DeepAgentResult,
  DraftFile,
} from './types.js'
import type { ToolContext } from './tools/index.js'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/** 推断项目根（harnessRoot）：本文件编译后位于 dist/core/agents/deep-agent/index.js */
function resolveHarnessRoot(): string {
  const here = fileURLToPath(import.meta.url)
  // dirname(dist/core/agents/deep-agent/index.js) → up 4 reaches repo root
  return resolve(dirname(here), '..', '..', '..', '..')
}

function resolveProvider(opts: DeepAgentOptions): AgentProvider {
  if (opts.provider) return opts.provider
  if (opts.model) {
    const p = inferProviderFromModel(opts.model)
    if (p) return p
  }
  return detectDefaultProvider(process.env) ?? 'anthropic'
}

function resolveApiKey(opts: DeepAgentOptions, provider: AgentProvider): string | null {
  if (opts.apiKey) return opts.apiKey
  const { apiKey } = readProviderEnv(provider, process.env)
  return apiKey ?? null
}

function resolveBaseUrl(opts: DeepAgentOptions, provider: AgentProvider): string | undefined {
  if (opts.baseUrl) return opts.baseUrl
  const { baseUrl } = readProviderEnv(provider, process.env)
  return baseUrl
}

/**
 * 从 deepagents 最终 state 里提取虚拟 FS（files 键值对）。
 * deepagents v2 FileData 为 `{content: string | string[] | Uint8Array, ...}`，
 * v1 legacy 为字符串数组；本函数统一展开为单一字符串。
 */
function extractVirtualFiles(state: unknown): Record<string, string> {
  if (!state || typeof state !== 'object') return {}
  const obj = state as Record<string, unknown>
  const files = obj.files
  if (!files || typeof files !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(files as Record<string, unknown>)) {
    const text = coerceFileContent(v)
    if (text !== null) out[k] = text
  }
  return out
}

function coerceFileContent(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return (v as string[]).join('\n')
  if (v && typeof v === 'object') {
    const fd = v as { content?: unknown }
    if (typeof fd.content === 'string') return fd.content
    if (Array.isArray(fd.content) && fd.content.every((x) => typeof x === 'string')) {
      return (fd.content as string[]).join('\n')
    }
  }
  return null
}

/**
 * 统一规范化虚拟 FS 路径。
 * 处理链：反斜杠 → 正斜杠；去盘符（C:/）；去前导 `./`、`/`；
 * 剥离沙盒常见前缀（app/、workspace/、project/、sandbox/、home/user/）；
 * 合并重复斜杠。
 */
function canonicalPath(p: string): string {
  let out = p
    .replace(/\\+/g, '/')
    .replace(/^[a-zA-Z]:\//, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim()
  // 剥离 deepagents 默认把 file_path 当绝对路径而添加的沙盒前缀
  const sandboxPrefixes = ['app/', 'workspace/', 'project/', 'sandbox/', 'home/user/', 'tmp/', 'var/']
  for (const prefix of sandboxPrefixes) {
    if (out.startsWith(prefix)) {
      out = out.slice(prefix.length)
      break
    }
  }
  return out
}

/** 将虚拟 FS 按白名单过滤为 DraftFile[]，同时返回被拒绝的路径清单（用于诊断） */
function filterWhitelist(
  files: Record<string, string>,
  whitelist: string[],
  targetDir: string,
): { drafts: DraftFile[]; rejected: string[] } {
  const allowed = new Set(whitelist.map(canonicalPath))
  const drafts: DraftFile[] = []
  const rejected: string[] = []
  for (const [path, content] of Object.entries(files)) {
    const norm = canonicalPath(path)
    if (!norm) {
      rejected.push(`${path} → (空路径)`)
      continue
    }
    if (!allowed.has(norm)) {
      rejected.push(`${path} → ${norm}`)
      continue
    }
    const safety = assertPathSafe(norm, targetDir)
    if (!safety.ok) {
      rejected.push(`${path} → ${norm} (安全检查拒绝)`)
      continue
    }
    drafts.push({ outputPath: norm, content, author: 'deep-agent' })
  }
  return { drafts, rejected }
}

/** 从 stream chunk 中抽取人类可读的步进信息，发射为 onStep 事件 */
async function emitStreamEvents(
  chunk: unknown,
  emit: (event: AgentStepEvent) => Promise<void>,
  cost: CostTracker,
  limiter: StepLimiter,
): Promise<void> {
  if (!chunk || typeof chunk !== 'object') return
  const obj = chunk as Record<string, unknown>
  const messages = Array.isArray(obj.messages) ? obj.messages : null
  if (!messages || messages.length === 0) return

  // 只处理最新一条消息，避免重复打印
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const last = messages[messages.length - 1] as any
  const role = last?._getType?.() ?? last?.type ?? last?.role ?? 'unknown'
  const content = typeof last?.content === 'string' ? last.content : ''
  const toolCalls = Array.isArray(last?.tool_calls) ? last.tool_calls : []

  // 累计 token usage
  const usage = last?.usage_metadata
  if (usage && typeof usage === 'object') {
    cost.addUsage(Number(usage.input_tokens ?? 0), Number(usage.output_tokens ?? 0))
  }

  if (toolCalls.length > 0) {
    limiter.tick()
    cost.incrementStep()
    for (const tc of toolCalls) {
      await emit({
        kind: 'tool_call',
        timestamp: Date.now(),
        data: { name: tc?.name ?? 'unknown', args: tc?.args ?? {} },
      })
    }
    // 若 AI 同时说了话（思考），也发射
    if (content) {
      await emit({ kind: 'thought', timestamp: Date.now(), data: { text: truncate(content, 200) } })
    }
    return
  }

  if (role === 'tool' || role === 'ToolMessage') {
    await emit({
      kind: 'tool_result',
      timestamp: Date.now(),
      data: {
        name: last?.name ?? 'tool',
        preview: truncate(content, 160),
      },
    })
    return
  }

  if (role === 'ai' || role === 'AIMessage') {
    if (content) {
      limiter.tick()
      cost.incrementStep()
      await emit({ kind: 'message', timestamp: Date.now(), data: { text: truncate(content, 200) } })
    }
  }
}

function truncate(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  return oneLine.length > n ? oneLine.slice(0, n) + '…' : oneLine
}

export async function runDeepAgent(opts: DeepAgentOptions): Promise<DeepAgentResult> {
  const deps = await loadDeepAgentDeps()
  if (!deps.ok) {
    return buildFallback(
      'deps-missing',
      `缺少 optional 依赖：${deps.missing.join(', ')}；请 pnpm add -O ${deps.missing.join(' ')}`,
    )
  }

  const provider = resolveProvider(opts)
  const providerCfg = PROVIDER_REGISTRY[provider]
  const apiKey = resolveApiKey(opts, provider)
  const baseUrl = resolveBaseUrl(opts, provider)

  if (providerCfg.requiresApiKey && !apiKey) {
    const envNames = providerCfg.apiKeyEnvVars.join(' / ')
    return buildFallback(
      'no-key',
      `未检测到 ${envNames}（${providerCfg.label}），Deep Agent 无法运行`,
    )
  }

  const depth = opts.depth
  const profile = DEPTH_PROFILES[depth]
  const model = opts.model || DEFAULT_MODELS[depth][provider]
  const totalTimeoutMs = opts.totalTimeoutMs ?? profile.totalTimeoutMs
  const maxSteps = opts.maxSteps ?? profile.maxSteps

  const runId = createRunId()
  const trace = new TraceWriter(opts.targetDir, runId)
  const cost = new CostTracker(provider, model)
  const limiter = new StepLimiter(maxSteps)
  const guard = new TimeoutGuard(totalTimeoutMs)

  const emit = async (event: AgentStepEvent) => {
    opts.onStep?.(event)
    await trace.write(event)
  }

  const toolCtx: ToolContext = {
    targetDir: opts.targetDir,
    harnessRoot: resolveHarnessRoot(),
    depth,
    readFileLineLimit: profile.readFileLineLimit,
    grepResultLimit: profile.grepResultLimit,
    askUserRemaining: profile.askUserLimit,
  }

  // 关键：任何路径都必须走 finally 释放 guard，避免 CLI 因悬挂 timer 挂起
  try {
    await emit({
      kind: 'message',
      timestamp: Date.now(),
      data: { msg: `deep-agent 启动（provider=${provider}, model=${model}, depth=${depth}）` },
    })

    let built
    try {
      built = buildDeepAgent({
        deps: deps.deps,
        projectName: opts.projectName,
        projectDescription: opts.projectDescription,
        techStackText: opts.userTechStack ?? '',
        presetName: opts.preset?.label ?? opts.preset?.name ?? '（通用）',
        presetKnowledgeSlug: opts.preset?.knowledgeSlug ?? null,
        agents: opts.agents,
        depth,
        provider,
        model,
        apiKey: apiKey ?? '',
        baseUrl,
        toolCtx,
        enableAskUser: opts.enableAskUser === true,
        fetchImpl: opts.fetchImpl,
      })
    } catch (err) {
      const reason = classifyError(err)
      const message = err instanceof Error ? err.message : String(err)
      await emit({ kind: 'error', timestamp: Date.now(), data: { where: 'build', reason, message } })
      return buildFallback(reason, message, [], cost.snapshot())
    }

    const whitelist = computeOutputWhitelist(opts.agents)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const graph = built.graph as any
      const invokePayload = {
        messages: [
          {
            role: 'user',
            content: [
              '请按系统提示里的白名单，逐个文件调用 write_file 工具写入内容。',
              '必须使用 write_file 工具实际写入文件，而不是把内容打印在回复里。',
              '所有文件写完后，直接回复"完成"即可结束。',
            ].join('\n'),
          },
        ],
      }
      const invokeOptions = {
        recursionLimit: maxSteps * 2,
        signal: guard.signal,
      }

      // 使用 stream 逐步发射事件，便于 CLI 实时打印进度
      let final: unknown = null
      const stream = await graph.stream(invokePayload, { ...invokeOptions, streamMode: 'values' })
      for await (const chunk of stream) {
        final = chunk
        await emitStreamEvents(chunk, emit, cost, limiter)
      }

      // 尽力提取 token usage（兜底：stream 过程中可能已累计）
      if (final && typeof final === 'object') {
        const msgs = (final as Record<string, unknown>).messages
        if (Array.isArray(msgs)) {
          for (const m of msgs) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usage = (m as any)?.usage_metadata
            if (usage && typeof usage === 'object') {
              cost.addUsage(Number(usage.input_tokens ?? 0), Number(usage.output_tokens ?? 0))
            }
          }
        }
      }

      const virtualFiles = extractVirtualFiles(final)
      const { drafts, rejected } = filterWhitelist(virtualFiles, whitelist, opts.targetDir)

      await emit({
        kind: 'message',
        timestamp: Date.now(),
        data: {
          msg: `deep-agent 完成：accepted=${drafts.length} rejected=${rejected.length}`,
          accepted: drafts.map((d) => d.outputPath),
          rejected,
          whitelist,
        },
      })

      if (drafts.length === 0) {
        const producedList = Object.keys(virtualFiles)
        const hint =
          producedList.length === 0
            ? 'Agent 未调用 write_file 工具写入任何文件'
            : `Agent 产出了 ${producedList.length} 个文件，但均不在白名单内：${producedList.slice(0, 6).join(', ')}${producedList.length > 6 ? ' …' : ''}`
        return buildFallback('parse-error', `Agent 未产出任何白名单文件。${hint}`, [], cost.snapshot())
      }

      return { status: 'success', drafts, cost: cost.snapshot(), tracePath: trace.path }
    } catch (err) {
      const reason = guard.isExpired()
        ? 'timeout'
        : limiter.exceeded()
          ? 'step-limit'
          : classifyError(err)
      const message = err instanceof Error ? err.message : String(err)
      await emit({ kind: 'error', timestamp: Date.now(), data: { where: 'invoke', reason, message } })
      return buildFallback(reason, message, [], cost.snapshot())
    }
  } finally {
    guard.dispose()
  }
}

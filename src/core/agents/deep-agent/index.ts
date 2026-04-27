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

/** 从 deepagents 最终 state 里提取虚拟 FS（files 键值对） */
function extractVirtualFiles(state: unknown): Record<string, string> {
  if (!state || typeof state !== 'object') return {}
  const obj = state as Record<string, unknown>
  const files = obj.files
  if (!files || typeof files !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(files as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

/** 将虚拟 FS 按白名单过滤为 DraftFile[] */
function filterWhitelist(files: Record<string, string>, whitelist: string[], targetDir: string): DraftFile[] {
  const allowed = new Set(whitelist.map((w) => w.replace(/\\/g, '/')))
  const drafts: DraftFile[] = []
  for (const [path, content] of Object.entries(files)) {
    const norm = path.replace(/\\/g, '/').replace(/^\.\//, '')
    if (!allowed.has(norm)) continue
    const safety = assertPathSafe(norm, targetDir)
    if (!safety.ok) continue
    drafts.push({ outputPath: norm, content, author: 'deep-agent' })
  }
  return drafts
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

  await emit({ kind: 'message', timestamp: Date.now(), data: { msg: 'deep-agent 启动', depth, model } })

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
    guard.dispose()
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
      messages: [{ role: 'user', content: '请按白名单生成所有规范文档并写入虚拟文件系统。' }],
    }
    const invokeOptions = {
      recursionLimit: maxSteps * 2,
      signal: guard.signal,
    }

    const final = await graph.invoke(invokePayload, invokeOptions)
    limiter.tick()
    cost.incrementStep()

    // 尽力提取 token usage（LangChain v0.3 会在 messages 末尾带 usage_metadata）
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
    const drafts = filterWhitelist(virtualFiles, whitelist, opts.targetDir)
    await emit({
      kind: 'message',
      timestamp: Date.now(),
      data: { msg: 'deep-agent 完成', drafts: drafts.map((d) => d.outputPath) },
    })

    if (drafts.length === 0) {
      return buildFallback('parse-error', 'Agent 未产出任何白名单文件', [], cost.snapshot())
    }

    guard.dispose()
    return { status: 'success', drafts, cost: cost.snapshot(), tracePath: trace.path }
  } catch (err) {
    guard.dispose()
    const reason = guard.isExpired() ? 'timeout' : limiter.exceeded() ? 'step-limit' : classifyError(err)
    const message = err instanceof Error ? err.message : String(err)
    await emit({ kind: 'error', timestamp: Date.now(), data: { where: 'invoke', reason, message } })
    return buildFallback(reason, message, [], cost.snapshot())
  }
}

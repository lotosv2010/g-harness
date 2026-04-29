// runDeepAgent：Deep Agent 主入口（v0.2.0）—— 永不抛错，失败一律转降级。

import { loadDeepAgentDeps, type DeepAgentDeps } from './lazy-import.js'
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
import {
  aggregateFinalUsage,
  emitStreamEvents,
  extractVirtualFiles,
  filterWhitelist,
} from './state-extractor.js'
import type { DeepAgentGraph } from './langchain-shims.js'
import type {
  AgentProvider,
  AgentStepEvent,
  DeepAgentOptions,
  DeepAgentResult,
} from './types.js'
import type { ToolContext } from './tools/index.js'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Deep Agent 运行所需的上下文（由 runDeepAgent 构造，跨阶段复用） */
interface RunContext {
  opts: DeepAgentOptions
  deps: DeepAgentDeps
  provider: AgentProvider
  model: string
  apiKey: string
  baseUrl: string | undefined
  maxSteps: number
  cost: CostTracker
  limiter: StepLimiter
  guard: TimeoutGuard
  trace: TraceWriter
  toolCtx: ToolContext
  emit: (event: AgentStepEvent) => Promise<void>
  /** build 阶段失败时临时承载结果，后续阶段直接返回 */
  buildFailure?: DeepAgentResult
}

/** 推断项目根（harnessRoot）：本文件编译后位于 dist/core/agents/deep-agent/index.js */
function resolveHarnessRoot(): string {
  const here = fileURLToPath(import.meta.url)
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

/** 构建 agent；失败转降级。返回 null 表示降级结果已写入 runCtx.buildFailure */
async function buildAgentSafely(runCtx: RunContext): Promise<{ graph: DeepAgentGraph } | null> {
  const { opts, deps, provider, model, apiKey, baseUrl, toolCtx, emit, cost } = runCtx
  try {
    return buildDeepAgent({
      deps,
      projectName: opts.projectName,
      projectDescription: opts.projectDescription,
      techStackText: opts.userTechStack ?? '',
      presetName: opts.preset?.label ?? opts.preset?.name ?? '（通用）',
      presetKnowledgeSlug: opts.preset?.knowledgeSlug ?? null,
      agents: opts.agents,
      depth: opts.depth,
      provider,
      model,
      apiKey,
      baseUrl,
      toolCtx,
      enableAskUser: opts.enableAskUser === true,
      fetchImpl: opts.fetchImpl,
    })
  } catch (err) {
    const reason = classifyError(err)
    const message = err instanceof Error ? err.message : String(err)
    await emit({ kind: 'error', timestamp: Date.now(), data: { where: 'build', reason, message } })
    runCtx.buildFailure = buildFallback(reason, message, [], cost.snapshot())
    return null
  }
}

/** 执行 graph.stream 并提取白名单文件，错误统一转降级 */
async function invokeAndExtract(
  runCtx: RunContext,
  built: { graph: DeepAgentGraph },
  whitelist: string[],
): Promise<DeepAgentResult> {
  const { opts, maxSteps, guard, limiter, cost, emit, trace } = runCtx
  try {
    const graph = built.graph
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
    const invokeOptions = { recursionLimit: maxSteps * 2, signal: guard.signal }

    let final: unknown = null
    const stream = await graph.stream(invokePayload, { ...invokeOptions, streamMode: 'values' })
    for await (const chunk of stream) {
      final = chunk
      await emitStreamEvents(chunk, emit, cost, limiter)
    }

    aggregateFinalUsage(final, cost)

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
      return buildNoOutputFallback(virtualFiles, cost)
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
}

function buildNoOutputFallback(
  virtualFiles: Record<string, string>,
  cost: CostTracker,
): DeepAgentResult {
  const producedList = Object.keys(virtualFiles)
  const hint =
    producedList.length === 0
      ? 'Agent 未调用 write_file 工具写入任何文件'
      : `Agent 产出了 ${producedList.length} 个文件，但均不在白名单内：${producedList.slice(0, 6).join(', ')}${producedList.length > 6 ? ' …' : ''}`
  return buildFallback('parse-error', `Agent 未产出任何白名单文件。${hint}`, [], cost.snapshot())
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

  const profile = DEPTH_PROFILES[opts.depth]
  const model = opts.model || DEFAULT_MODELS[opts.depth][provider]
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
    depth: opts.depth,
    readFileLineLimit: profile.readFileLineLimit,
    grepResultLimit: profile.grepResultLimit,
    askUserRemaining: profile.askUserLimit,
  }

  const runCtx: RunContext = {
    opts,
    deps: deps.deps,
    provider,
    model,
    apiKey: apiKey ?? '',
    baseUrl,
    maxSteps,
    cost,
    limiter,
    guard,
    trace,
    toolCtx,
    emit,
  }

  // 任何路径都必须走 finally 释放 guard，避免 CLI 因悬挂 timer 挂起
  try {
    await emit({
      kind: 'message',
      timestamp: Date.now(),
      data: { msg: `deep-agent 启动（provider=${provider}, model=${model}, depth=${opts.depth}）` },
    })

    const built = await buildAgentSafely(runCtx)
    if (!built) {
      return runCtx.buildFailure ?? buildFallback('unsupported', 'agent 构建返回空结果')
    }

    const whitelist = computeOutputWhitelist(opts.agents)
    return await invokeAndExtract(runCtx, built, whitelist)
  } finally {
    guard.dispose()
  }
}

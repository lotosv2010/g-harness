// Deep Agent 主入口 —— runDeepAgent 编排器
//
// 职责：
// 1. 预检：加载 optional 依赖 / 解析 provider + API key / 检测索引
// 2. 构建：agent-factory 产出 runnable（注入主 prompt + subagents + 工具集 + 模型）
// 3. 运行：用 TimeoutGuard + StepLimiter + CostTracker 包一层护栏后 invoke
// 4. 提取：从 state.files 还原 DraftFile[]，过滤白名单外路径
// 5. 观测：每一步写 JSONL trace，末尾写 summary
// 6. 降级：任一级失败返回 { status: 'fallback', reason, message, partialDrafts, cost }
//
// 本文件不负责：
// - 实际落盘（由 FileGenerator 消费 DraftFile[]）
// - fallback 链编排到 llm-enhance/template（由 fallback.ts 处理）
// - CLI 交互（由 init-interactive 处理）

import { loadDeepAgentDeps } from './lazy-import.js'
import { buildDeepAgent } from './agent-factory.js'
import { DEPTH_PROFILES, DEFAULT_MODELS } from './config.js'
import { CostTracker, StepLimiter, TimeoutGuard, isTimeoutError } from './guards/index.js'
import { buildSystemPrompt, OUTPUT_WHITELIST_DEFAULT } from './prompts/system-prompt.js'
import { buildSubagents } from './prompts/subagent-prompts.js'
import { TraceWriter, makeStepEvent } from './trace/trace-writer.js'
import type {
  AgentProvider,
  AgentStepEvent,
  DeepAgentOptions,
  DeepAgentResult,
  DraftFile,
  FallbackReason,
} from './types.js'

const WHITELIST_SET = new Set<string>(OUTPUT_WHITELIST_DEFAULT)

/**
 * 顶层入口：跑一次 Deep Agent 生成规范。
 * 永不抛错 —— 所有失败路径都返回 { status: 'fallback', ... }。
 */
export async function runDeepAgent(options: DeepAgentOptions): Promise<DeepAgentResult> {
  const trace = new TraceWriter({ targetDir: options.targetDir })
  const emit = (ev: AgentStepEvent): void => {
    options.onStep?.(ev)
    void trace.append(ev)
  }

  // --- 1. 依赖加载 ---
  const depsResult = await loadDeepAgentDeps()
  if (!depsResult.ok) {
    const reason: FallbackReason = 'deps-missing'
    const message = `缺少 optional 依赖：${depsResult.missing.join(', ')}`
    emit(makeStepEvent('error', { reason, message }))
    await trace.writeSummary({ status: 'fallback', steps: 0, durationMs: 0, cost: null, errorMessage: message })
    return { status: 'fallback', reason, message, partialDrafts: [], cost: null }
  }

  // --- 2. provider + key 解析（优先级：显式 options > env，ADR-011） ---
  const credsResult = resolveCredentials(options.provider, options.apiKey)
  if (!credsResult.ok) {
    const reason: FallbackReason = 'no-key'
    emit(makeStepEvent('error', { reason, message: credsResult.message }))
    await trace.writeSummary({
      status: 'fallback',
      steps: 0,
      durationMs: 0,
      cost: null,
      errorMessage: credsResult.message,
    })
    return { status: 'fallback', reason, message: credsResult.message, partialDrafts: [], cost: null }
  }
  const { provider, apiKey } = credsResult

  // --- 3. 上下文构建 ---
  const profile = DEPTH_PROFILES[options.depth]
  const maxSteps = options.maxSteps ?? profile.maxSteps
  const totalTimeoutMs = options.totalTimeoutMs ?? profile.totalTimeoutMs
  // 模型优先级（ADR-011）：options.model > DEFAULT_MODELS[depth][provider]
  const modelId = options.model ?? DEFAULT_MODELS[options.depth][provider]

  const hasIndex = detectHasIndex(options)
  const systemPrompt = buildSystemPrompt({
    projectName: options.projectName,
    projectDescription: options.projectDescription,
    presetName: options.preset?.name ?? null,
    depth: options.depth,
    techStack: extractStack(options),
    userTechStack: options.userTechStack,
    hasIndex,
    outputWhitelist: [...OUTPUT_WHITELIST_DEFAULT],
  })
  const subagents = buildSubagents({
    projectName: options.projectName,
    presetName: options.preset?.name ?? null,
    depth: options.depth,
  })

  // --- 4. Agent 构建 ---
  let built
  try {
    built = buildDeepAgent({
      deps: depsResult.deps,
      targetDir: options.targetDir,
      depth: options.depth,
      provider,
      apiKey,
      model: modelId,
      systemPrompt,
      enableAskUser: options.enableAskUser,
      subagents,
    })
  } catch (err) {
    const reason: FallbackReason = 'unsupported'
    const message = err instanceof Error ? err.message : String(err)
    emit(makeStepEvent('error', { reason, message }))
    await trace.writeSummary({ status: 'fallback', steps: 0, durationMs: 0, cost: null, errorMessage: message })
    return { status: 'fallback', reason, message, partialDrafts: [], cost: null }
  }

  emit(
    makeStepEvent('message', {
      phase: 'start',
      model: built.modelId,
      tools: built.toolNames,
      subagents: subagents.map((s) => s.name),
      depth: options.depth,
    }),
  )

  // --- 5. 护栏 ---
  const cost = new CostTracker({ provider, model: modelId, maxTokens: profile.maxTokens })
  const steps = new StepLimiter({ maxSteps })
  const timeout = new TimeoutGuard({ timeoutMs: totalTimeoutMs })

  // --- 6. 运行 ---
  let partialDrafts: DraftFile[] = []
  try {
    const result = await invokeAgent({
      runnable: built.runnable,
      prompt: systemPrompt,
      signal: timeout.signal,
      cost,
      steps,
      emit,
    })

    partialDrafts = extractDrafts(result.files)

    if (timeout.timedOut) {
      return await handleFallback(trace, emit, 'timeout', `总超时 ${totalTimeoutMs}ms`, partialDrafts, cost)
    }
    if (steps.isExceeded()) {
      return await handleFallback(trace, emit, 'step-limit', `步数超限（${steps.current}/${steps.limit}）`, partialDrafts, cost)
    }
    if (cost.isExceeded()) {
      return await handleFallback(trace, emit, 'token-limit', `token 超限（${cost.snapshot().inputTokens + cost.snapshot().outputTokens}/${profile.maxTokens}）`, partialDrafts, cost)
    }
    if (partialDrafts.length === 0) {
      return await handleFallback(trace, emit, 'parse-error', 'agent 未产出任何白名单文件', partialDrafts, cost)
    }

    const report = cost.snapshot()
    emit(makeStepEvent('message', { phase: 'done', drafts: partialDrafts.map((d) => d.outputPath) }))
    await trace.writeSummary({
      status: 'success',
      steps: report.steps,
      durationMs: report.durationMs,
      cost: report,
      draftFiles: partialDrafts.map((d) => d.outputPath),
    })
    return { status: 'success', drafts: partialDrafts, cost: report, tracePath: trace.filePath }
  } catch (err) {
    if (isTimeoutError(err)) {
      return await handleFallback(trace, emit, 'timeout', `总超时触发`, partialDrafts, cost)
    }
    const message = err instanceof Error ? err.message : String(err)
    return await handleFallback(trace, emit, 'network-error', message, partialDrafts, cost)
  } finally {
    timeout.dispose()
  }
}

// --- helpers -----------------------------------------------------------------

interface InvokeResult {
  files: Record<string, string>
}

interface LangGraphRunnable {
  invoke: (input: unknown, cfg?: unknown) => Promise<unknown>
  stream?: (input: unknown, cfg?: unknown) => AsyncIterable<unknown>
}

/**
 * 以 stream 优先、invoke 兜底的方式运行 agent。
 * 每一步聚合 usage + 写 trace。
 */
async function invokeAgent(args: {
  runnable: unknown
  prompt: string
  signal: AbortSignal
  cost: CostTracker
  steps: StepLimiter
  emit: (ev: AgentStepEvent) => void
}): Promise<InvokeResult> {
  const { runnable, prompt, signal, cost, steps, emit } = args
  const r = runnable as LangGraphRunnable
  const input = { messages: [{ role: 'user', content: prompt }] }
  const cfg = { signal, configurable: { thread_id: `g-harness-${Date.now()}` } }

  let lastState: Record<string, unknown> = {}
  if (typeof r.stream === 'function') {
    for await (const chunk of r.stream(input, cfg)) {
      if (!steps.tick()) break
      const state = extractState(chunk)
      if (state) lastState = { ...lastState, ...state }
      const messages = extractMessages(state ?? chunk)
      for (const m of messages) {
        cost.addFromMessage(m)
        emit(makeStepEvent('message', summarizeMessage(m)))
      }
      if (cost.isExceeded()) break
    }
  } else {
    const final = await r.invoke(input, cfg)
    lastState = (final as Record<string, unknown>) ?? {}
    const messages = extractMessages(lastState)
    for (const m of messages) cost.addFromMessage(m)
  }

  const files = (lastState.files as Record<string, string> | undefined) ?? {}
  return { files }
}

function extractState(chunk: unknown): Record<string, unknown> | null {
  if (!chunk || typeof chunk !== 'object') return null
  const c = chunk as Record<string, unknown>
  // LangGraph stream 每个 chunk 是 { [nodeName]: stateUpdate }
  for (const value of Object.values(c)) {
    if (value && typeof value === 'object') return value as Record<string, unknown>
  }
  return null
}

function extractMessages(state: unknown): unknown[] {
  if (!state || typeof state !== 'object') return []
  const s = state as Record<string, unknown>
  const arr = s.messages
  return Array.isArray(arr) ? arr : []
}

function summarizeMessage(m: unknown): Record<string, unknown> {
  if (!m || typeof m !== 'object') return { type: 'unknown' }
  const msg = m as Record<string, unknown>
  const type = (msg.type ?? msg._getType?.constructor?.name ?? 'message') as string
  const content = msg.content
  const text = typeof content === 'string' ? content.slice(0, 500) : '[structured]'
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : undefined
  return { type, text, toolCalls }
}

function extractDrafts(files: Record<string, string>): DraftFile[] {
  const drafts: DraftFile[] = []
  for (const [path, content] of Object.entries(files)) {
    const normalized = path.replace(/^\.?\//, '').replace(/\\/g, '/')
    if (!WHITELIST_SET.has(normalized)) continue
    if (typeof content !== 'string' || content.trim().length === 0) continue
    drafts.push({ outputPath: normalized, content })
  }
  return drafts
}

function detectHasIndex(options: DeepAgentOptions): boolean {
  const sr = options.scanResult
  if (!sr) return false
  const signals = sr.existingConfig as unknown as Record<string, unknown>
  const indexKeys = ['hasProjectMap', 'hasFeaturesIndex', 'hasRoutesIndex']
  return indexKeys.some((k) => signals[k] === true)
}

function extractStack(options: DeepAgentOptions): {
  language: string | null
  framework: string | null
  runtime: string | null
  packageManager: string | null
} {
  const t = options.scanResult?.techStack
  return {
    language: t?.language ?? null,
    framework: t?.framework ?? null,
    runtime: t?.runtime ?? null,
    packageManager: t?.packageManager ?? null,
  }
}

interface CredentialsResolved {
  ok: true
  provider: AgentProvider
  apiKey: string
}
interface CredentialsFailed {
  ok: false
  message: string
}

/**
 * 解析 provider + apiKey，优先级（ADR-011）：
 * 1. 显式 provider + 显式 apiKey → 直用
 * 2. 显式 provider + env[provider] → 采纳 env
 * 3. 无显式：env 自动挑（anthropic 优先）
 */
function resolveCredentials(
  explicitProvider?: AgentProvider,
  explicitKey?: string,
): CredentialsResolved | CredentialsFailed {
  const anthKey = process.env.ANTHROPIC_API_KEY
  const oaiKey = process.env.OPENAI_API_KEY

  if (explicitProvider === 'anthropic') {
    const key = explicitKey ?? anthKey
    if (!key) return { ok: false, message: '指定 anthropic 但未设置 ANTHROPIC_API_KEY' }
    return { ok: true, provider: 'anthropic', apiKey: key }
  }
  if (explicitProvider === 'openai') {
    const key = explicitKey ?? oaiKey
    if (!key) return { ok: false, message: '指定 openai 但未设置 OPENAI_API_KEY' }
    return { ok: true, provider: 'openai', apiKey: key }
  }
  // 无显式 provider：若同时给了 key 但没给 provider，视为错配
  if (explicitKey) {
    return { ok: false, message: '提供了 apiKey 但未指定 provider（ADR-011）' }
  }
  // 自动：anthropic 优先
  if (anthKey) return { ok: true, provider: 'anthropic', apiKey: anthKey }
  if (oaiKey) return { ok: true, provider: 'openai', apiKey: oaiKey }
  return { ok: false, message: '未检测到 ANTHROPIC_API_KEY 或 OPENAI_API_KEY' }
}

async function handleFallback(
  trace: TraceWriter,
  emit: (ev: AgentStepEvent) => void,
  reason: FallbackReason,
  message: string,
  partialDrafts: DraftFile[],
  cost: CostTracker,
): Promise<DeepAgentResult> {
  const report = cost.snapshot()
  emit(makeStepEvent('error', { reason, message }))
  await trace.writeSummary({
    status: 'fallback',
    steps: report.steps,
    durationMs: report.durationMs,
    cost: report,
    errorMessage: `${reason}: ${message}`,
    draftFiles: partialDrafts.map((d) => d.outputPath),
  })
  return { status: 'fallback', reason, message, partialDrafts, cost: report }
}

// --- re-exports --------------------------------------------------------------

export type { DeepAgentOptions, DeepAgentResult, DraftFile } from './types.js'
export { OUTPUT_WHITELIST_DEFAULT } from './prompts/system-prompt.js'

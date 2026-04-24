// LLM 补全层 — 可选增强：在规则版 ContentCompletion 基础上，用 LLM 润色叙述性字段
//
// 设计要点：
// - 无 API key 时静默降级到规则版（zero-dep、zero-risk）
// - 仅润色自然语言字段（projectPositioning / productBoundaries / moduleBreakdown）
// - 保持表格、Markdown 结构由规则层决定，避免 LLM 产出破坏模板
// - 任何网络/解析错误一律回落规则版，并在 reason 中标注
// - 使用 Node 18+ 内建 fetch，不引入新依赖

import type { ContentCompletion } from './content-completer.js'
import type { DescriptionAnalysis } from './description-analyzer.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface LlmCompleterOptions {
  analysis: DescriptionAnalysis
  ruleBased: ContentCompletion
  projectName: string
  projectDescription: string
  scanResult: ScanResult
  /** 请求超时（毫秒），默认 15000 */
  timeoutMs?: number
  /** 强制指定供应商，否则按环境变量自动选择 */
  provider?: 'anthropic' | 'openai'
  /** 覆盖环境变量（测试用） */
  env?: Partial<Record<'ANTHROPIC_API_KEY' | 'OPENAI_API_KEY', string>>
  /** 注入 fetch 便于测试 */
  fetchImpl?: typeof fetch
}

export type LlmProvider = 'anthropic' | 'openai'

export interface LlmEnhanceResult {
  completion: ContentCompletion
  /** 实际使用的供应商，无则为 null */
  provider: LlmProvider | null
  /** 是否成功增强（覆盖了至少一个字段） */
  enhanced: boolean
  /** 未增强时的降级原因 */
  reason?: 'no-key' | 'timeout' | 'network-error' | 'parse-error' | 'empty'
}

/** 可被 LLM 覆盖的字段白名单 */
const OVERRIDABLE_FIELDS = ['projectPositioning', 'productBoundaries', 'moduleBreakdown'] as const

type OverridableField = (typeof OVERRIDABLE_FIELDS)[number]

/**
 * 尝试用 LLM 增强规则版 ContentCompletion。
 * 无 API key 或任何失败场景都回落到规则版，永不抛错。
 */
export async function enhanceWithLlm(opts: LlmCompleterOptions): Promise<LlmEnhanceResult> {
  const env = { ...readEnv(), ...(opts.env ?? {}) }
  const provider = resolveProvider(env, opts.provider)

  if (!provider) {
    return { completion: opts.ruleBased, provider: null, enhanced: false, reason: 'no-key' }
  }

  const key = provider === 'anthropic' ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY
  if (!key) {
    return { completion: opts.ruleBased, provider: null, enhanced: false, reason: 'no-key' }
  }

  const timeoutMs = opts.timeoutMs ?? 15000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const prompt = buildPrompt(opts)
    const raw = await callProvider(provider, key, prompt, controller.signal, opts.fetchImpl ?? fetch)
    const parsed = parseOverrides(raw)
    if (!parsed) {
      return { completion: opts.ruleBased, provider, enhanced: false, reason: 'parse-error' }
    }

    const merged = mergeOverrides(opts.ruleBased, parsed)
    const enhanced = Object.keys(parsed).length > 0
    return {
      completion: merged,
      provider,
      enhanced,
      reason: enhanced ? undefined : 'empty',
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      completion: opts.ruleBased,
      provider,
      enhanced: false,
      reason: aborted ? 'timeout' : 'network-error',
    }
  } finally {
    clearTimeout(timer)
  }
}

function readEnv(): Record<'ANTHROPIC_API_KEY' | 'OPENAI_API_KEY', string | undefined> {
  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
}

function resolveProvider(
  env: Record<string, string | undefined>,
  forced?: LlmProvider,
): LlmProvider | null {
  if (forced) return forced
  if (env.ANTHROPIC_API_KEY) return 'anthropic'
  if (env.OPENAI_API_KEY) return 'openai'
  return null
}

function buildPrompt(opts: LlmCompleterOptions): string {
  const { projectName, projectDescription, analysis, scanResult, ruleBased } = opts
  const stack = [scanResult.techStack.framework, scanResult.techStack.language]
    .filter(Boolean)
    .join(' + ') || '未指定'

  return `你是一位资深软件架构文档撰写者，请根据以下项目信息，优化 SPEC/ARCHITECTURE 文档中的叙述性内容。

## 项目信息
- 名称：${projectName}
- 描述：${projectDescription || '（无）'}
- 应用类型：${analysis.appType}
- 业务领域：${analysis.domain ?? '通用'}
- 识别特性：${analysis.features.join('、') || '未识别'}
- 建议模块：${analysis.suggestedModules.join('、') || '未识别'}
- 技术栈：${stack}

## 当前规则版生成的内容（供参考基准）
### projectPositioning
${ruleBased.projectPositioning}

### productBoundaries
${ruleBased.productBoundaries}

### moduleBreakdown
${ruleBased.moduleBreakdown}

## 任务
请改写上述 3 个字段，让语言更自然、更切合项目实际。**要求**：
1. 仅返回一个 JSON 对象，键名必须是 \`projectPositioning\` / \`productBoundaries\` / \`moduleBreakdown\` 的子集
2. 值必须是 Markdown 字符串，保持与规则版相同的结构（如列表、标题、表格）
3. 若某字段无法改进则省略该键
4. 禁止返回 JSON 以外的任何内容（不要代码块围栏、不要前后说明）
5. 保持中文输出

请输出 JSON：`
}

async function callProvider(
  provider: LlmProvider,
  key: string,
  prompt: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<string> {
  if (provider === 'anthropic') {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`anthropic ${res.status}`)
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    return text
  }

  // openai chat completions
  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`openai ${res.status}`)
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

function parseOverrides(raw: string): Partial<Record<OverridableField, string>> | null {
  if (!raw.trim()) return null

  // 容错：去除可能的代码块围栏
  let text = raw.trim()
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  if (fence) text = fence[1]

  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    return null
  }

  if (!obj || typeof obj !== 'object') return null
  const out: Partial<Record<OverridableField, string>> = {}
  for (const key of OVERRIDABLE_FIELDS) {
    const val = (obj as Record<string, unknown>)[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      out[key] = val
    }
  }
  return out
}

function mergeOverrides(
  base: ContentCompletion,
  overrides: Partial<Record<OverridableField, string>>,
): ContentCompletion {
  return { ...base, ...overrides }
}

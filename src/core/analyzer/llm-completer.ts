// 窄 LLM 增强（v0.2.0 白名单：architecture_overview + module_breakdown）
//
// 设计原则：
// - 仅改写两个叙述性字段，其他变量维持规则版产出
// - 失败（无 key / 网络错 / 解析失败）透明降级，不抛错
// - 降级时返回原值，调用方通过 ok 标志判断是否命中 LLM
// - 不使用 LangChain，直接 fetch 文本接口，避免增加依赖

import type { TemplateVariables } from '../commands/init-types.js'
import type { AgentProvider } from '../agents/deep-agent/types.js'
import {
  DEFAULT_MODELS,
  PROVIDER_REGISTRY,
  detectDefaultProvider,
  readProviderEnv,
} from '../agents/deep-agent/config.js'

export interface EnhanceInput {
  provider?: AgentProvider
  model?: string
  apiKey?: string
  projectName: string
  projectDescription: string
  techStackText: string
  variables: TemplateVariables
  fetchImpl?: typeof fetch
  /** 单次请求超时（毫秒），默认 30s */
  timeoutMs?: number
}

export type EnhanceReason =
  | 'no-key'
  | 'network-error'
  | 'parse-error'
  | 'timeout'
  | 'unsupported'

export type EnhanceResult =
  | { ok: true; variables: TemplateVariables; provider: AgentProvider; model: string }
  | { ok: false; reason: EnhanceReason; message: string; variables: TemplateVariables }

export async function enhanceWithLlm(input: EnhanceInput): Promise<EnhanceResult> {
  const resolvedProvider = input.provider ?? detectDefaultProvider(process.env)
  if (!resolvedProvider) {
    return { ok: false, reason: 'no-key', message: '未配置 LLM API key，跳过 LLM 增强', variables: input.variables }
  }

  // 窄增强仅支持直连 HTTP 的 provider：anthropic/openai
  if (resolvedProvider !== 'anthropic' && resolvedProvider !== 'openai') {
    return {
      ok: false,
      reason: 'unsupported',
      message: `窄 LLM 增强暂不支持 ${resolvedProvider}；请改用 Deep Agent 或切换至 anthropic/openai`,
      variables: input.variables,
    }
  }

  const providerCfg = PROVIDER_REGISTRY[resolvedProvider]
  const apiKey = input.apiKey ?? readProviderEnv(resolvedProvider, process.env).apiKey
  if (providerCfg.requiresApiKey && !apiKey) {
    return { ok: false, reason: 'no-key', message: `${resolvedProvider} API key 缺失`, variables: input.variables }
  }

  const model = input.model ?? DEFAULT_MODELS.medium[resolvedProvider]
  const fetcher = input.fetchImpl ?? globalThis.fetch
  const timeoutMs = input.timeoutMs ?? 30_000

  const prompt = buildPrompt(input)

  try {
    const raw = await callModel({
      provider: resolvedProvider,
      model,
      apiKey: apiKey ?? '',
      prompt,
      fetcher,
      timeoutMs,
    })
    const parsed = parseJsonBlock(raw)
    if (!parsed) {
      return { ok: false, reason: 'parse-error', message: 'LLM 返回无法解析为目标 JSON', variables: input.variables }
    }
    const merged: TemplateVariables = { ...input.variables }
    if (typeof parsed.architecture_overview === 'string' && parsed.architecture_overview.trim()) {
      merged.architecture_overview = parsed.architecture_overview.trim()
    }
    if (typeof parsed.module_breakdown === 'string' && parsed.module_breakdown.trim()) {
      merged.module_breakdown = parsed.module_breakdown.trim()
    }
    return { ok: true, variables: merged, provider: resolvedProvider, model }
  } catch (err) {
    const reason: EnhanceReason = (err as { name?: string }).name === 'AbortError' ? 'timeout' : 'network-error'
    return { ok: false, reason, message: (err as Error).message, variables: input.variables }
  }
}

function buildPrompt(input: EnhanceInput): string {
  return [
    '你是一名高级软件架构师。基于以下项目输入，为 Harness Engineering 规范文档改写两段叙述。',
    '',
    `项目名：${input.projectName}`,
    `定位：${input.projectDescription}`,
    `技术栈：${input.techStackText || '（未指定）'}`,
    '',
    '规则版已给出的草稿（供参考）：',
    `- architecture_overview：${input.variables.architecture_overview}`,
    `- module_breakdown：${input.variables.module_breakdown}`,
    '',
    '请输出一个严格 JSON 对象，仅包含两个键：',
    '- architecture_overview（一句话，≤ 80 字，描述分层与数据流方向）',
    '- module_breakdown（markdown bullet 列表，3-6 项，每项 "- `name/`：职责"）',
    '',
    '要求：',
    '1. 不新增其它字段；不要把项目名硬塞进架构说明；不要讨论工具链',
    '2. 输出必须是纯 JSON，可被 JSON.parse 解析，禁止 markdown 代码块围栏',
    '3. 使用中文',
  ].join('\n')
}

interface CallModelInput {
  provider: 'anthropic' | 'openai'
  model: string
  apiKey: string
  prompt: string
  fetcher: typeof fetch
  timeoutMs: number
}

async function callModel(input: CallModelInput): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    if (input.provider === 'anthropic') {
      return await callAnthropic(input, controller.signal)
    }
    return await callOpenAI(input, controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

async function callAnthropic(input: CallModelInput, signal: AbortSignal): Promise<string> {
  const res = await input.fetcher('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': input.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: input.prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`)
  const json = (await res.json()) as { content?: Array<{ text?: string }> }
  const text = json.content?.map((c) => c.text ?? '').join('') ?? ''
  if (!text) throw new Error('Anthropic 返回空内容')
  return text
}

async function callOpenAI(input: CallModelInput, signal: AbortSignal): Promise<string> {
  const res = await input.fetcher('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 800,
      messages: [{ role: 'user', content: input.prompt }],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = json.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('OpenAI 返回空内容')
  return text
}

function parseJsonBlock(raw: string): { architecture_overview?: string; module_breakdown?: string } | null {
  const trimmed = raw.trim()
  try {
    return JSON.parse(trimmed) as { architecture_overview?: string; module_breakdown?: string }
  } catch {
    // 容错：尝试抽取第一个 { ... } 块
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as { architecture_overview?: string; module_breakdown?: string }
    } catch {
      return null
    }
  }
}

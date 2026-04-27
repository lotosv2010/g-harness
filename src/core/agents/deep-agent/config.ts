// Deep Agent 常量配置 —— depth 档位、模型价目、provider 注册表（v0.2.1）
// 对齐 g-fund-agent/src/modules/llm/llm.service.ts

import type { AgentProvider, Depth } from './types.js'

export interface DepthProfile {
  maxSteps: number
  maxTokens: number
  totalTimeoutMs: number
  toolTimeoutMs: number
  maxSubAgents: number
  readFileLineLimit: number
  grepResultLimit: number
  askUserLimit: number
}

export const DEPTH_PROFILES: Record<Depth, DepthProfile> = {
  shallow: {
    maxSteps: 10,
    maxTokens: 15_000,
    totalTimeoutMs: 2 * 60 * 1000,
    toolTimeoutMs: 30 * 1000,
    maxSubAgents: 1,
    readFileLineLimit: 250,
    grepResultLimit: 50,
    askUserLimit: 0,
  },
  medium: {
    maxSteps: 25,
    maxTokens: 50_000,
    totalTimeoutMs: 5 * 60 * 1000,
    toolTimeoutMs: 45 * 1000,
    maxSubAgents: 2,
    readFileLineLimit: 500,
    grepResultLimit: 100,
    askUserLimit: 2,
  },
  deep: {
    maxSteps: 60,
    maxTokens: 150_000,
    totalTimeoutMs: 10 * 60 * 1000,
    toolTimeoutMs: 60 * 1000,
    maxSubAgents: 3,
    readFileLineLimit: 500,
    grepResultLimit: 200,
    askUserLimit: 3,
  },
}

/**
 * API 协议类型，决定实际实例化哪个 LangChain 客户端。
 * - anthropic-compat：ChatAnthropic，支持 baseURL（minimax 走此路径）
 * - openai-compat：ChatOpenAI，支持 baseURL（moonshot 走此路径）
 * - deepseek：ChatDeepSeek（带自定义 baseURL）
 * - google：ChatGoogleGenerativeAI
 * - ollama：ChatOllama（本地，无需 apiKey）
 */
export type ApiProtocol = 'anthropic-compat' | 'openai-compat' | 'deepseek' | 'google' | 'ollama'

export interface ProviderConfig {
  /** 该 provider 使用的协议（决定客户端构造） */
  protocol: ApiProtocol
  /** 人类可读名称 */
  label: string
  /** 从哪些环境变量读 apiKey（按顺序尝试） */
  apiKeyEnvVars: readonly string[]
  /** 从哪些环境变量读 baseURL（按顺序尝试） */
  baseUrlEnvVars: readonly string[]
  /** 从哪些环境变量读 model（按顺序尝试） */
  modelEnvVars: readonly string[]
  /** 默认 baseURL（可选，env 未给时使用） */
  defaultBaseUrl?: string
  /** 可选模型列表（CLI 选单展示） */
  modelChoices: readonly ModelChoice[]
  /** 默认模型 ID */
  defaultModel: string
  /** 是否需要 apiKey（ollama 本地模型不需要） */
  requiresApiKey: boolean
  /** 额外传给 LangChain 客户端的参数（如 Kimi 的 thinking:disabled） */
  extraKwargs?: Readonly<Record<string, unknown>>
}

export interface ModelChoice {
  id: string
  label: string
  /** 输入 token 单价（美元 / 百万 token），ollama 本地为 0 */
  inputPerM: number
  outputPerM: number
  recommendedFor?: Depth[]
}

/**
 * 多 provider 注册表（v0.2.1）
 * 对齐 g-fund-agent/src/modules/llm/llm.service.ts 的 buildModelRegistry。
 *
 * 价目表数据源：2026-04
 * - Anthropic：https://anthropic.com/pricing
 * - OpenAI：https://openai.com/api/pricing
 * - DeepSeek：https://api-docs.deepseek.com/quick_start/pricing
 * - 其他国产 provider 定价参考官网
 */
export const PROVIDER_REGISTRY: Record<AgentProvider, ProviderConfig> = {
  anthropic: {
    protocol: 'anthropic-compat',
    label: 'Anthropic（Claude）',
    apiKeyEnvVars: ['ANTHROPIC_API_KEY'],
    baseUrlEnvVars: ['ANTHROPIC_BASE_URL'],
    modelEnvVars: ['ANTHROPIC_MODEL'],
    defaultModel: 'claude-haiku-4-5',
    requiresApiKey: true,
    modelChoices: [
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5（$1/$5）— 快且便宜', inputPerM: 1.0, outputPerM: 5.0, recommendedFor: ['shallow', 'medium'] },
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5（$3/$15）— 质量优先', inputPerM: 3.0, outputPerM: 15.0, recommendedFor: ['deep'] },
    ],
  },
  openai: {
    protocol: 'openai-compat',
    label: 'OpenAI（GPT）',
    apiKeyEnvVars: ['OPENAI_API_KEY'],
    baseUrlEnvVars: ['OPENAI_BASE_URL'],
    modelEnvVars: ['OPENAI_MODEL'],
    defaultModel: 'gpt-4o-mini',
    requiresApiKey: true,
    modelChoices: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini（$0.15/$0.6）— 极致便宜', inputPerM: 0.15, outputPerM: 0.6, recommendedFor: ['shallow', 'medium'] },
      { id: 'gpt-4o', label: 'GPT-4o（$2.5/$10）— 质量优先', inputPerM: 2.5, outputPerM: 10.0, recommendedFor: ['deep'] },
    ],
  },
  deepseek: {
    protocol: 'deepseek',
    label: 'DeepSeek',
    apiKeyEnvVars: ['DEEPSEEK_API_KEY'],
    baseUrlEnvVars: ['DEEPSEEK_BASE_URL'],
    modelEnvVars: ['DEEPSEEK_MODEL'],
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true,
    modelChoices: [
      { id: 'deepseek-chat', label: 'deepseek-chat（~$0.27/$1.1）— 通用快速', inputPerM: 0.27, outputPerM: 1.1, recommendedFor: ['shallow', 'medium'] },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner（~$0.55/$2.19）— 深度推理', inputPerM: 0.55, outputPerM: 2.19, recommendedFor: ['deep'] },
    ],
  },
  minimax: {
    protocol: 'anthropic-compat',
    label: 'MiniMax（MM-M 系列，Anthropic 兼容）',
    apiKeyEnvVars: ['MINIMAX_API_KEY'],
    baseUrlEnvVars: ['MINIMAX_BASE_URL'],
    modelEnvVars: ['MINIMAX_MODEL'],
    defaultBaseUrl: 'https://api.minimaxi.com/anthropic',
    defaultModel: 'MiniMax-M2.7',
    requiresApiKey: true,
    modelChoices: [
      { id: 'MiniMax-M2.7', label: 'MiniMax-M2.7（国产、Anthropic 协议）', inputPerM: 0.3, outputPerM: 1.5, recommendedFor: ['shallow', 'medium', 'deep'] },
    ],
  },
  gemini: {
    protocol: 'google',
    label: 'Google Gemini',
    apiKeyEnvVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    baseUrlEnvVars: [],
    modelEnvVars: ['GEMINI_MODEL'],
    defaultModel: 'gemini-2.5-flash',
    requiresApiKey: true,
    modelChoices: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash（~$0.075/$0.3）— 快速廉价', inputPerM: 0.075, outputPerM: 0.3, recommendedFor: ['shallow', 'medium'] },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro（~$1.25/$5）— 长上下文', inputPerM: 1.25, outputPerM: 5.0, recommendedFor: ['deep'] },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview（预览版）', inputPerM: 0.1, outputPerM: 0.4, recommendedFor: ['shallow', 'medium'] },
    ],
  },
  moonshot: {
    protocol: 'openai-compat',
    label: 'Moonshot Kimi（OpenAI 兼容）',
    apiKeyEnvVars: ['MOONSHOT_API_KEY'],
    baseUrlEnvVars: ['MOONSHOT_BASE_URL'],
    modelEnvVars: ['MOONSHOT_MODEL'],
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
    requiresApiKey: true,
    extraKwargs: { thinking: { type: 'disabled' } },
    modelChoices: [
      { id: 'kimi-k2.5', label: 'Kimi K2.5（128k 长上下文）', inputPerM: 0.8, outputPerM: 2.4, recommendedFor: ['medium', 'deep'] },
      { id: 'moonshot-v1-32k', label: 'Moonshot v1 32k', inputPerM: 1.5, outputPerM: 1.5, recommendedFor: ['shallow', 'medium'] },
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128k', inputPerM: 4.0, outputPerM: 4.0, recommendedFor: ['deep'] },
    ],
  },
  ollama: {
    protocol: 'ollama',
    label: 'Ollama（本地，无需 key）',
    apiKeyEnvVars: [],
    baseUrlEnvVars: ['OLLAMA_BASE_URL'],
    modelEnvVars: ['OLLAMA_MODEL'],
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'qwen3.5:cloud',
    requiresApiKey: false,
    modelChoices: [
      { id: 'qwen3.5:cloud', label: 'Qwen 3.5 Cloud（本地 Ollama）', inputPerM: 0, outputPerM: 0, recommendedFor: ['shallow', 'medium', 'deep'] },
      { id: 'llama3.2', label: 'Llama 3.2（本地 Ollama）', inputPerM: 0, outputPerM: 0, recommendedFor: ['shallow', 'medium'] },
    ],
  },
}

/** 按 depth 推荐默认模型（provider → model ID） */
export const DEFAULT_MODELS: Record<Depth, Record<AgentProvider, string>> = {
  shallow: {
    anthropic: 'claude-haiku-4-5',
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
    minimax: 'MiniMax-M2.7',
    gemini: 'gemini-2.5-flash',
    moonshot: 'kimi-k2.5',
    ollama: 'qwen3.5:cloud',
  },
  medium: {
    anthropic: 'claude-haiku-4-5',
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
    minimax: 'MiniMax-M2.7',
    gemini: 'gemini-2.5-flash',
    moonshot: 'kimi-k2.5',
    ollama: 'qwen3.5:cloud',
  },
  deep: {
    anthropic: 'claude-sonnet-4-5',
    openai: 'gpt-4o',
    deepseek: 'deepseek-reasoner',
    minimax: 'MiniMax-M2.7',
    gemini: 'gemini-2.5-pro',
    moonshot: 'moonshot-v1-128k',
    ollama: 'qwen3.5:cloud',
  },
}

/** 所有 provider ID 列表（CLI 选单用） */
export const ALL_PROVIDERS: AgentProvider[] = [
  'anthropic',
  'openai',
  'deepseek',
  'minimax',
  'gemini',
  'moonshot',
  'ollama',
]

/** 按 provider 获取模型选项（CLI 展示用） */
export function getModelChoices(provider: AgentProvider): readonly ModelChoice[] {
  return PROVIDER_REGISTRY[provider].modelChoices
}

/** 获取所有已知 model id（可跨 provider） */
export function listModelIds(provider?: AgentProvider): string[] {
  if (provider) return [...getModelChoices(provider).map((c) => c.id)]
  return ALL_PROVIDERS.flatMap((p) => getModelChoices(p).map((c) => c.id))
}

/** 从 model id 反推 provider（在多 provider 注册表中查找） */
export function inferProviderFromModel(model: string): AgentProvider | null {
  for (const prov of ALL_PROVIDERS) {
    if (PROVIDER_REGISTRY[prov].modelChoices.some((c) => c.id === model)) return prov
  }
  return null
}

/** 根据 provider 从环境变量读取 apiKey / baseUrl / model（按配置的优先顺序） */
export function readProviderEnv(
  provider: AgentProvider,
  env: NodeJS.ProcessEnv = process.env,
): { apiKey?: string; baseUrl?: string; model?: string } {
  const cfg = PROVIDER_REGISTRY[provider]
  const pick = (vars: readonly string[]): string | undefined => {
    for (const name of vars) {
      const v = env[name]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return undefined
  }
  return {
    apiKey: pick(cfg.apiKeyEnvVars),
    baseUrl: pick(cfg.baseUrlEnvVars) ?? cfg.defaultBaseUrl,
    model: pick(cfg.modelEnvVars),
  }
}

/** 根据所有 provider 的 env 推断一个默认 provider（优先级：LLM_PROVIDER env > 已设置 apiKey 的 provider） */
export function detectDefaultProvider(env: NodeJS.ProcessEnv = process.env): AgentProvider | null {
  const explicit = env.LLM_PROVIDER?.trim().toLowerCase()
  if (explicit && ALL_PROVIDERS.includes(explicit as AgentProvider)) {
    return explicit as AgentProvider
  }
  for (const prov of ALL_PROVIDERS) {
    const { apiKey } = readProviderEnv(prov, env)
    const cfg = PROVIDER_REGISTRY[prov]
    if (!cfg.requiresApiKey) continue
    if (apiKey) return prov
  }
  if (env.OLLAMA_BASE_URL || env.OLLAMA_MODEL) return 'ollama'
  return null
}

export const PRICING_AS_OF = '2026-04-01'

/** 计算单次运行的估算费用（美元） */
export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  for (const prov of ALL_PROVIDERS) {
    const hit = PROVIDER_REGISTRY[prov].modelChoices.find((c) => c.id === model)
    if (hit) {
      return (inputTokens / 1_000_000) * hit.inputPerM + (outputTokens / 1_000_000) * hit.outputPerM
    }
  }
  return 0
}

/** 成本展示：< $0.01 显示 "<$0.01"，otherwise 保留两位小数 */
export function formatUsd(amount: number): string {
  if (amount <= 0) return '$0.00'
  if (amount < 0.01) return '<$0.01'
  return `$${amount.toFixed(2)}`
}

/** 校验模型 ID 是否在价目表内（任一 provider） */
export function isKnownModel(model: string): boolean {
  return inferProviderFromModel(model) !== null
}

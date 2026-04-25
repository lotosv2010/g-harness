// Deep Agent 常量配置 —— 三档 depth 的步数/token/超时上限表 + 模型价目

import type { AgentProvider, Depth } from './types.js'

export interface DepthProfile {
  /** 循环步数上限 */
  maxSteps: number
  /** 总 token 预算（input + output，超出自动降级） */
  maxTokens: number
  /** 总超时（毫秒） */
  totalTimeoutMs: number
  /** 单次工具调用超时（毫秒） */
  toolTimeoutMs: number
  /** 允许的子 agent 最大并发数 */
  maxSubAgents: number
  /** readFile 工具单文件行数上限 */
  readFileLineLimit: number
  /** grep 工具结果条数上限 */
  grepResultLimit: number
  /** askUser 问题数上限（0 = 禁用） */
  askUserLimit: number
}

/** 三档 depth 的硬上限（ADR-010） */
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

export interface ModelPricing {
  provider: AgentProvider
  model: string
  /** 输入 token 单价（美元 / 百万 token） */
  inputPerM: number
  /** 输出 token 单价（美元 / 百万 token） */
  outputPerM: number
}

/**
 * 模型价目表（2026-04 数据源）
 * 单次 init 我们优先用快模型（Haiku / gpt-4o-mini）控制成本；
 * 深层分析可选 Sonnet 升档。
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    inputPerM: 1.0,
    outputPerM: 5.0,
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    inputPerM: 3.0,
    outputPerM: 15.0,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPerM: 0.15,
    outputPerM: 0.6,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputPerM: 2.5,
    outputPerM: 10.0,
  },
}

/** 默认模型映射 —— depth 越深用越强的模型 */
export const DEFAULT_MODELS: Record<Depth, { anthropic: string; openai: string }> = {
  shallow: { anthropic: 'claude-haiku-4-5', openai: 'gpt-4o-mini' },
  medium: { anthropic: 'claude-haiku-4-5', openai: 'gpt-4o-mini' },
  deep: { anthropic: 'claude-sonnet-4-5', openai: 'gpt-4o' },
}

/** 可选模型清单（交互式 Stage 5 / CLI --model 的合法取值来源，ADR-011） */
export interface ModelChoice {
  id: string
  label: string
  /** 该模型在哪些 depth 档位被推荐 */
  recommendedFor?: Depth[]
}

export const ANTHROPIC_MODEL_CHOICES: ModelChoice[] = [
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5（$1/$5）—— 快且便宜',
    recommendedFor: ['shallow', 'medium'],
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5（$3/$15）—— 质量优先',
    recommendedFor: ['deep'],
  },
]

export const OPENAI_MODEL_CHOICES: ModelChoice[] = [
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini（$0.15/$0.6）—— 极致便宜',
    recommendedFor: ['shallow', 'medium'],
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o（$2.5/$10）—— 质量优先',
    recommendedFor: ['deep'],
  },
]

/** 按 provider 返回模型选项列表 */
export function getModelChoices(provider: AgentProvider): ModelChoice[] {
  return provider === 'anthropic' ? ANTHROPIC_MODEL_CHOICES : OPENAI_MODEL_CHOICES
}

/** 按 provider 返回所有合法模型 ID（CLI --model 校验用） */
export function listModelIds(provider?: AgentProvider): string[] {
  if (provider) return getModelChoices(provider).map((c) => c.id)
  return [...ANTHROPIC_MODEL_CHOICES, ...OPENAI_MODEL_CHOICES].map((c) => c.id)
}

/** 由模型 ID 反查所属 provider（用于 CLI --model 但未指定 provider 时） */
export function inferProviderFromModel(model: string): AgentProvider | null {
  if (ANTHROPIC_MODEL_CHOICES.some((c) => c.id === model)) return 'anthropic'
  if (OPENAI_MODEL_CHOICES.some((c) => c.id === model)) return 'openai'
  return null
}

export const PRICING_AS_OF = '2026-04-01'

/** 计算单次运行的估算费用（美元） */
export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[model]
  if (!p) return 0
  return (inputTokens / 1_000_000) * p.inputPerM + (outputTokens / 1_000_000) * p.outputPerM
}

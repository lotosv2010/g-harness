// Deep Agent 常量配置 —— depth 档位、模型价目（v0.2.0）

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

export interface ModelPricing {
  provider: AgentProvider
  model: string
  /** 输入 token 单价（美元 / 百万 token） */
  inputPerM: number
  outputPerM: number
}

/**
 * 模型价目表（2026-04 数据源）
 * 浅/中档优先用 Haiku / gpt-4o-mini 控成本；深档可升 Sonnet / gpt-4o。
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': { provider: 'anthropic', model: 'claude-haiku-4-5', inputPerM: 1.0, outputPerM: 5.0 },
  'claude-sonnet-4-5': { provider: 'anthropic', model: 'claude-sonnet-4-5', inputPerM: 3.0, outputPerM: 15.0 },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', inputPerM: 0.15, outputPerM: 0.6 },
  'gpt-4o': { provider: 'openai', model: 'gpt-4o', inputPerM: 2.5, outputPerM: 10.0 },
}

export const DEFAULT_MODELS: Record<Depth, Record<AgentProvider, string>> = {
  shallow: { anthropic: 'claude-haiku-4-5', openai: 'gpt-4o-mini' },
  medium: { anthropic: 'claude-haiku-4-5', openai: 'gpt-4o-mini' },
  deep: { anthropic: 'claude-sonnet-4-5', openai: 'gpt-4o' },
}

export interface ModelChoice {
  id: string
  label: string
  recommendedFor?: Depth[]
}

export const ANTHROPIC_MODEL_CHOICES: ModelChoice[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5（$1/$5）—— 快且便宜', recommendedFor: ['shallow', 'medium'] },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5（$3/$15）—— 质量优先', recommendedFor: ['deep'] },
]

export const OPENAI_MODEL_CHOICES: ModelChoice[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini（$0.15/$0.6）—— 极致便宜', recommendedFor: ['shallow', 'medium'] },
  { id: 'gpt-4o', label: 'GPT-4o（$2.5/$10）—— 质量优先', recommendedFor: ['deep'] },
]

export function getModelChoices(provider: AgentProvider): ModelChoice[] {
  return provider === 'anthropic' ? ANTHROPIC_MODEL_CHOICES : OPENAI_MODEL_CHOICES
}

export function listModelIds(provider?: AgentProvider): string[] {
  if (provider) return getModelChoices(provider).map((c) => c.id)
  return [...ANTHROPIC_MODEL_CHOICES, ...OPENAI_MODEL_CHOICES].map((c) => c.id)
}

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

/** 成本展示：< $0.01 显示 "<$0.01"，否则保留两位小数 */
export function formatUsd(amount: number): string {
  if (amount <= 0) return '$0.00'
  if (amount < 0.01) return '<$0.01'
  return `$${amount.toFixed(2)}`
}

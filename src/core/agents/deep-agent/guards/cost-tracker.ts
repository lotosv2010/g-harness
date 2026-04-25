// CostTracker —— 聚合 LangChain usage_metadata 并换算美元成本
//
// 设计要点：
// - 不感知 provider：统一以 { input_tokens, output_tokens } 为契约
// - 增量累加（add），不做全量重放
// - 超出 maxTokens 阈值时返回 exceeded 信号，调用方负责降级
// - calcCost 使用 config.ts 的价目表，未知模型 → $0（透明降级）

import { calcCost, MODEL_PRICING, PRICING_AS_OF } from '../config.js'
import type { AgentProvider, CostReport } from '../types.js'

export interface UsageMetadata {
  input_tokens?: number
  output_tokens?: number
  /** 某些 provider 汇报的总数（忽略，按 input+output 自计） */
  total_tokens?: number
}

export interface CostTrackerOptions {
  provider: AgentProvider
  model: string
  /** token 硬上限；超出后 isExceeded 返回 true */
  maxTokens: number
}

export class CostTracker {
  private inputTokens = 0
  private outputTokens = 0
  private steps = 0
  private readonly startedAt: number

  constructor(private readonly opts: CostTrackerOptions) {
    this.startedAt = Date.now()
  }

  /** 累加单步消耗；invalid 数据静默忽略 */
  add(usage: UsageMetadata | null | undefined): void {
    if (!usage) return
    const i = typeof usage.input_tokens === 'number' ? usage.input_tokens : 0
    const o = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0
    if (i > 0) this.inputTokens += i
    if (o > 0) this.outputTokens += o
    this.steps += 1
  }

  /** 从任意 AIMessage 风格的对象中提取 usage 并累加 */
  addFromMessage(message: unknown): void {
    if (!message || typeof message !== 'object') return
    const m = message as Record<string, unknown>
    const usage =
      (m.usage_metadata as UsageMetadata | undefined) ??
      (m.usage as UsageMetadata | undefined) ??
      null
    this.add(usage)
  }

  /** 是否已超阈值（input + output） */
  isExceeded(): boolean {
    return this.inputTokens + this.outputTokens >= this.opts.maxTokens
  }

  /** 剩余预算（可能为负） */
  remaining(): number {
    return this.opts.maxTokens - (this.inputTokens + this.outputTokens)
  }

  /** 导出最终报告（供 runDeepAgent 返回） */
  snapshot(): CostReport {
    return {
      provider: this.opts.provider,
      model: this.opts.model,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      estimatedUsd: calcCost(this.opts.model, this.inputTokens, this.outputTokens),
      steps: this.steps,
      durationMs: Date.now() - this.startedAt,
    }
  }
}

/** 人类可读的预估行：`$0.0234（haiku，123 input + 456 output，as of 2026-04-01）` */
export function formatCostLine(report: CostReport): string {
  const pricing = MODEL_PRICING[report.model]
  const asOf = pricing ? PRICING_AS_OF : '未知模型'
  return `$${report.estimatedUsd.toFixed(4)}（${report.model}，${report.inputTokens} input + ${report.outputTokens} output，步数 ${report.steps}，耗时 ${(report.durationMs / 1000).toFixed(1)}s，价目 ${asOf}）`
}

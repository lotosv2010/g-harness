// 成本聚合器：统计 input/output token，计算累计费用

import { calcCost } from '../config.js'
import type { AgentProvider, CostReport } from '../types.js'

export class CostTracker {
  private inputTokens = 0
  private outputTokens = 0
  private steps = 0
  private start = Date.now()

  constructor(private readonly provider: AgentProvider, private readonly model: string) {}

  addUsage(input: number, output: number): void {
    this.inputTokens += Math.max(0, input | 0)
    this.outputTokens += Math.max(0, output | 0)
  }

  incrementStep(): void {
    this.steps += 1
  }

  get totalTokens(): number {
    return this.inputTokens + this.outputTokens
  }

  snapshot(): CostReport {
    return {
      provider: this.provider,
      model: this.model,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      estimatedUsd: calcCost(this.model, this.inputTokens, this.outputTokens),
      steps: this.steps,
      durationMs: Date.now() - this.start,
    }
  }
}

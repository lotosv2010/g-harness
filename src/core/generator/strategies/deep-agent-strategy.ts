// Deep Agent 策略：触发 runDeepAgent；产出不足或失败时降级到 LlmEnhanceStrategy → TemplateStrategy。

import { runDeepAgent } from '../../agents/deep-agent/index.js'
import { LlmEnhanceStrategy } from './llm-enhance-strategy.js'
import { TemplateStrategy } from './template-strategy.js'
import type { DraftFile, GenerationContext, GenerationStrategy, StrategyResult } from './strategy-types.js'

export class DeepAgentStrategy implements GenerationStrategy {
  readonly name = 'deep-agent' as const

  async produce(ctx: GenerationContext): Promise<StrategyResult> {
    if (!ctx.depth) {
      ctx.onMessage?.('Deep Agent 缺少 depth；降级到 LLM 增强')
      return this.degradeToLlm(ctx, 'deep-agent', '缺少 depth 参数')
    }

    const result = await runDeepAgent({
      targetDir: ctx.targetDir,
      scanResult: ctx.scanResult,
      preset: ctx.preset,
      projectName: ctx.meta.projectName,
      projectDescription: ctx.meta.projectDescription,
      depth: ctx.depth,
      agents: ctx.agents,
      provider: ctx.provider,
      model: ctx.model,
      apiKey: ctx.apiKey,
      baseUrl: ctx.baseUrl,
      userTechStack: ctx.meta.techStackText,
      fetchImpl: ctx.fetchImpl,
      onStep: (ev) => {
        if (ev.kind === 'message' || ev.kind === 'error') {
          const data = JSON.stringify(ev.data)
          ctx.onMessage?.(`[deep-agent] ${data}`)
        }
      },
    })

    if (result.status === 'success') {
      // Deep Agent 产出 ≤ 白名单；再用模板策略补齐剩余文件（protocols / guardrails / ADR / tasks 等）
      const deepDrafts = result.drafts.map((d): DraftFile => ({
        outputPath: d.outputPath,
        content: d.content,
      }))
      const deepPaths = new Set(deepDrafts.map((d) => d.outputPath))

      const base = await new TemplateStrategy().produce(ctx)
      const merged: DraftFile[] = [...deepDrafts]
      for (const d of base.drafts) {
        if (!deepPaths.has(d.outputPath)) merged.push(d)
      }
      ctx.onMessage?.(
        `Deep Agent 成功：${deepDrafts.length} 文件由 Agent 产出；${merged.length - deepDrafts.length} 由模板补齐`,
      )
      return { drafts: merged, usedStrategy: 'deep-agent' }
    }

    ctx.onMessage?.(`Deep Agent 降级：${result.reason} — ${result.message}`)
    return this.degradeToLlm(ctx, 'deep-agent', `${result.reason}: ${result.message}`)
  }

  private async degradeToLlm(
    ctx: GenerationContext,
    from: 'deep-agent',
    reason: string,
  ): Promise<StrategyResult> {
    const llm = new LlmEnhanceStrategy()
    try {
      const r = await llm.produce(ctx)
      return {
        drafts: r.drafts,
        usedStrategy: r.usedStrategy,
        degradedFrom: from,
        degradeReason: reason,
      }
    } catch (err) {
      ctx.onMessage?.(`LLM 增强也失败；降级到规则版：${(err as Error).message}`)
      const base = await new TemplateStrategy().produce(ctx)
      return {
        drafts: base.drafts,
        usedStrategy: 'template',
        degradedFrom: from,
        degradeReason: reason,
      }
    }
  }
}

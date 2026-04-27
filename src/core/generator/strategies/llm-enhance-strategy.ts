// LLM 增强策略：先用 TemplateStrategy 产出，再对 variables 做窄增强。

import { enhanceWithLlm } from '../../analyzer/llm-completer.js'
import { TemplateStrategy } from './template-strategy.js'
import type { GenerationContext, GenerationStrategy, StrategyResult } from './strategy-types.js'

export class LlmEnhanceStrategy implements GenerationStrategy {
  readonly name = 'llm-enhance' as const

  async produce(ctx: GenerationContext): Promise<StrategyResult> {
    const enhanced = await enhanceWithLlm({
      provider: ctx.provider,
      model: ctx.model,
      apiKey: ctx.apiKey,
      projectName: ctx.meta.projectName,
      projectDescription: ctx.meta.projectDescription,
      techStackText: ctx.meta.techStackText,
      variables: ctx.variables,
      fetchImpl: ctx.fetchImpl,
    })

    if (enhanced.ok) {
      ctx.onMessage?.(`LLM 增强命中：${enhanced.provider}/${enhanced.model}`)
    } else {
      ctx.onMessage?.(`LLM 增强跳过：${enhanced.reason} — ${enhanced.message}`)
    }

    const mergedCtx: GenerationContext = { ...ctx, variables: enhanced.variables }
    const base = new TemplateStrategy()
    const result = await base.produce(mergedCtx)

    return {
      drafts: result.drafts,
      usedStrategy: enhanced.ok ? 'llm-enhance' : 'template',
      degradedFrom: enhanced.ok ? undefined : 'llm-enhance',
      degradeReason: enhanced.ok ? undefined : enhanced.message,
    }
  }
}

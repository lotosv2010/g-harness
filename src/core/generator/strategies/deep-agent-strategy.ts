// Deep Agent 策略：触发 runDeepAgent；产出不足或失败时降级到 LlmEnhanceStrategy → TemplateStrategy。

import { runDeepAgent } from '../../agents/deep-agent/index.js'
import { LlmEnhanceStrategy } from './llm-enhance-strategy.js'
import { TemplateStrategy } from './template-strategy.js'
import type { DraftFile, GenerationContext, GenerationStrategy, StrategyResult } from './strategy-types.js'

function formatArgs(args: unknown): string {
  if (!args || typeof args !== 'object') return ''
  const entries = Object.entries(args as Record<string, unknown>)
  if (entries.length === 0) return ''
  const first = entries[0]
  const key = first[0]
  const val = first[1]
  const shown = typeof val === 'string' ? val : JSON.stringify(val)
  const trimmed = shown.length > 60 ? shown.slice(0, 60) + '…' : shown
  return entries.length > 1 ? `${key}=${trimmed}, …` : `${key}=${trimmed}`
}

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
        // 把 Deep Agent 的思考 / 工具调用 / 结果 / 错误 转成人类可读进度行
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = ev.data as any
        let line: string | null = null
        switch (ev.kind) {
          case 'thought':
            line = `💭 ${d?.text ?? ''}`
            break
          case 'tool_call':
            line = `🔧 ${d?.name ?? 'tool'}(${formatArgs(d?.args)})`
            break
          case 'tool_result':
            line = `✓ ${d?.name ?? 'tool'} → ${d?.preview ?? ''}`
            break
          case 'message':
            line = d?.msg ?? (d?.text ? `🤖 ${d.text}` : null)
            break
          case 'error':
            line = `✗ ${d?.reason ?? 'error'}: ${d?.message ?? ''}`
            break
        }
        if (line) ctx.onMessage?.(`[deep-agent] ${line}`)
      },
    })

    if (result.status === 'success') {
      // Deep Agent 产出 ≤ 白名单；再用模板策略补齐剩余文件（protocols / guardrails / ADR / tasks 等）
      // 关键：Agent 产出内容不足（空串 / 小于阈值 / 仍含未替换占位符）时视为无效，退回模板版本
      const MIN_MEANINGFUL_BYTES = 80
      const validDeepDrafts: DraftFile[] = []
      const invalidPaths: string[] = []
      for (const d of result.drafts) {
        const trimmed = d.content.trim()
        const hasPlaceholder = /\{\{\s*\w+\s*\}\}/.test(trimmed)
        if (trimmed.length < MIN_MEANINGFUL_BYTES || hasPlaceholder) {
          invalidPaths.push(d.outputPath)
          continue
        }
        validDeepDrafts.push({ outputPath: d.outputPath, content: d.content })
      }
      const deepPaths = new Set(validDeepDrafts.map((d) => d.outputPath))

      const base = await new TemplateStrategy().produce(ctx)
      const merged: DraftFile[] = [...validDeepDrafts]
      for (const d of base.drafts) {
        if (!deepPaths.has(d.outputPath)) merged.push(d)
      }
      if (invalidPaths.length > 0) {
        ctx.onMessage?.(
          `Deep Agent 产出但内容不足的 ${invalidPaths.length} 个文件退回模板：${invalidPaths.slice(0, 6).join(', ')}${invalidPaths.length > 6 ? ' …' : ''}`,
        )
      }
      ctx.onMessage?.(
        `Deep Agent 成功：${validDeepDrafts.length} 文件由 Agent 产出；${merged.length - validDeepDrafts.length} 由模板补齐`,
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

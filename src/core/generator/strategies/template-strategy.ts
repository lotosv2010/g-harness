// 规则版策略：从 shared/ 模板 + per-agent entry 装配，替换 {{var}} 产出 DraftFile[]。

import { AgentAdapter } from '../../agents/agent-adapter.js'
import { resolveVariables } from '../../variables.js'
import { collectTemplateFiles } from '../file-collector.js'
import type { GenerationContext, GenerationStrategy, StrategyResult, DraftFile } from './strategy-types.js'

export class TemplateStrategy implements GenerationStrategy {
  readonly name = 'template' as const

  async produce(ctx: GenerationContext): Promise<StrategyResult> {
    const templateFiles = await collectTemplateFiles(ctx.harnessRoot)
    const adapter = new AgentAdapter()
    const drafts: DraftFile[] = []
    const seen = new Set<string>()

    // shared 模板先渲染为通用 FileEntry
    const rendered = templateFiles.map((f) => ({
      outputPath: f.outputPath,
      content: resolveVariables(f.content, ctx.variables),
    }))

    // 对每个 agent：adapter 过滤 + 映射 .ai/ → configDir
    for (const agent of ctx.agents) {
      if (agent.id === 'generic') continue
      const adapted = adapter.adaptFiles(rendered, agent)
      for (const entry of adapted) {
        if (seen.has(entry.outputPath)) continue
        seen.add(entry.outputPath)
        drafts.push({ outputPath: entry.outputPath, content: entry.content })
      }
      // 加载 agent 特定入口文件
      const entryTemplate = await adapter.loadEntryTemplate(ctx.harnessRoot, agent)
      if (entryTemplate) {
        const entryContent = resolveVariables(entryTemplate.content, ctx.variables)
        if (!seen.has(entryTemplate.outputPath)) {
          seen.add(entryTemplate.outputPath)
          drafts.push({ outputPath: entryTemplate.outputPath, content: entryContent })
        }
      }
    }

    return { drafts, usedStrategy: 'template' }
  }
}

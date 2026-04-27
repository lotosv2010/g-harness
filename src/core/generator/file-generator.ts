// 薄派发器：策略选择 → produce → 冲突解决 → 写盘。

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileExists } from '../fs-utils.js'
import { buildVariables } from './variables-builder.js'
import { TemplateStrategy } from './strategies/template-strategy.js'
import { LlmEnhanceStrategy } from './strategies/llm-enhance-strategy.js'
import { DeepAgentStrategy } from './strategies/deep-agent-strategy.js'
import type { GenerationContext, GenerationStrategy, DraftFile } from './strategies/strategy-types.js'
import type {
  ConflictStrategy,
  GenerateMode,
  ProjectMeta,
  TemplateVariables,
} from '../commands/init-types.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'
import type { Preset } from '../preset-loader.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface GenerateOptions {
  targetDir: string
  harnessRoot: string
  agents: AgentDefinition[]
  preset: Preset | null
  meta: ProjectMeta
  scanResult: ScanResult
  mode: GenerateMode
  conflict: ConflictStrategy
  /** dry-run：只产出 drafts，不写盘 */
  dryRun?: boolean
  /** LLM / Deep Agent 参数 */
  depth?: Depth
  provider?: AgentProvider
  model?: string
  apiKey?: string
  /** 额外注入变量（覆盖规则版） */
  extraVariables?: Partial<TemplateVariables>
  fetchImpl?: typeof fetch
  onMessage?: (msg: string) => void
}

export interface WrittenFile {
  path: string
  action: 'created' | 'overwritten' | 'skipped'
}

export interface GenerateResult {
  usedStrategy: 'template' | 'llm-enhance' | 'deep-agent'
  degradedFrom?: 'deep-agent' | 'llm-enhance'
  degradeReason?: string
  drafts: DraftFile[]
  written: WrittenFile[]
  variables: TemplateVariables
}

function pickStrategy(mode: GenerateMode): GenerationStrategy {
  switch (mode) {
    case 'deep-agent':
      return new DeepAgentStrategy()
    case 'llm-enhance':
      return new LlmEnhanceStrategy()
    case 'template':
    default:
      return new TemplateStrategy()
  }
}

export class FileGenerator {
  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const variables: TemplateVariables = {
      ...buildVariables({
        meta: opts.meta,
        scanResult: opts.scanResult,
        preset: opts.preset,
      }),
      ...(opts.extraVariables as Record<string, string>),
    }

    const ctx: GenerationContext = {
      targetDir: opts.targetDir,
      harnessRoot: opts.harnessRoot,
      agents: opts.agents,
      preset: opts.preset,
      meta: opts.meta,
      scanResult: opts.scanResult,
      variables,
      depth: opts.depth,
      provider: opts.provider,
      model: opts.model,
      apiKey: opts.apiKey,
      fetchImpl: opts.fetchImpl,
      onMessage: opts.onMessage,
    }

    const strategy = pickStrategy(opts.mode)
    const outcome = await strategy.produce(ctx)

    const written: WrittenFile[] = []
    if (!opts.dryRun) {
      for (const draft of outcome.drafts) {
        const abs = join(opts.targetDir, draft.outputPath)
        const exists = await fileExists(abs)
        if (exists && opts.conflict === 'skip') {
          written.push({ path: draft.outputPath, action: 'skipped' })
          continue
        }
        await mkdir(dirname(abs), { recursive: true })
        await writeFile(abs, draft.content, 'utf-8')
        written.push({ path: draft.outputPath, action: exists ? 'overwritten' : 'created' })
      }
    }

    return {
      usedStrategy: outcome.usedStrategy,
      degradedFrom: outcome.degradedFrom,
      degradeReason: outcome.degradeReason,
      drafts: outcome.drafts,
      written,
      variables,
    }
  }
}

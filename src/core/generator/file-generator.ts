// 薄派发器：策略选择 → produce → 类别过滤 → 冲突解决 → 写盘。

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileExists } from '../fs-utils.js'
import { buildVariables } from './variables-builder.js'
import { filterBySelection } from '../template-categories.js'
import type { CategorySelectionMap } from '../template-categories.js'
import { TemplateStrategy } from './strategies/template-strategy.js'
import { LlmEnhanceStrategy } from './strategies/llm-enhance-strategy.js'
import { DeepAgentStrategy } from './strategies/deep-agent-strategy.js'
import type { GenerationContext, GenerationStrategy, DraftFile } from './strategies/strategy-types.js'
import type {
  ConflictStrategy,
  GenerateMode,
  ProjectMeta,
  ReadmeStrategy,
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
  /** 用户模板选择结果 */
  templateSelection?: CategorySelectionMap
  /** README.md 处理策略 */
  readmeStrategy?: ReadmeStrategy
  /** dry-run：只产出 drafts，不写盘 */
  dryRun?: boolean
  /** LLM / Deep Agent 参数 */
  depth?: Depth
  provider?: AgentProvider
  model?: string
  apiKey?: string
  baseUrl?: string
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
      baseUrl: opts.baseUrl,
      fetchImpl: opts.fetchImpl,
      onMessage: opts.onMessage,
    }

    const strategy = pickStrategy(opts.mode)
    const outcome = await strategy.produce(ctx)

    // 按用户模板选择过滤 drafts
    if (opts.templateSelection) {
      outcome.drafts = filterBySelection(outcome.drafts, opts.templateSelection) as DraftFile[]
    }

    const written: WrittenFile[] = []
    if (!opts.dryRun) {
      for (const draft of outcome.drafts) {
        const abs = join(opts.targetDir, draft.outputPath)
        const exists = await fileExists(abs)
        const isReadme = draft.outputPath === 'README.md'
        const isHooksSettings = draft.outputPath.endsWith('hooks/settings-hooks.json')

        // README.md 使用独立策略
        if (isReadme) {
          const action = await this.handleReadme(abs, draft.content, exists, opts.readmeStrategy)
          written.push({ path: draft.outputPath, action })
          continue
        }

        // hooks settings 合并到目标 settings.json
        if (isHooksSettings) {
          const action = await this.mergeHooksSettings(opts.targetDir, draft.content, draft.outputPath)
          written.push(action)
          continue
        }

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

  private async handleReadme(
    abs: string,
    templateContent: string,
    exists: boolean,
    strategy?: ReadmeStrategy,
  ): Promise<WrittenFile['action']> {
    const resolved = strategy ?? (exists ? 'skip' : 'overwrite')

    if (resolved === 'skip') return 'skipped'

    await mkdir(dirname(abs), { recursive: true })

    if (resolved === 'merge' && exists) {
      const existing = await readFile(abs, 'utf-8')
      const separator = '\n\n---\n\n<!-- g-harness 规范补充（自动生成） -->\n\n'
      const merged = existing.trimEnd() + separator + templateContent
      await writeFile(abs, merged, 'utf-8')
      return 'overwritten'
    }

    await writeFile(abs, templateContent, 'utf-8')
    return exists ? 'overwritten' : 'created'
  }

  private async mergeHooksSettings(
    targetDir: string,
    hooksSettingsContent: string,
    outputPath: string,
  ): Promise<WrittenFile> {
    // 从 hooks settings 路径推断目标 settings.json 位置
    // .claude/hooks/settings-hooks.json → .claude/settings.json
    const configDir = outputPath.replace(/hooks\/settings-hooks\.json$/, '')
    const settingsPath = join(targetDir, configDir, 'settings.json')
    const exists = await fileExists(settingsPath)

    try {
      const hooksConfig = JSON.parse(hooksSettingsContent)
      let merged: Record<string, unknown>

      if (exists) {
        const existing = JSON.parse(await readFile(settingsPath, 'utf-8'))
        merged = { ...existing, hooks: { ...(existing.hooks || {}), ...hooksConfig.hooks } }
      } else {
        merged = hooksConfig
      }

      await mkdir(dirname(settingsPath), { recursive: true })
      await writeFile(settingsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
      return { path: configDir + 'settings.json', action: exists ? 'overwritten' : 'created' }
    } catch {
      // JSON 解析失败：直接写入原文件
      await mkdir(dirname(settingsPath), { recursive: true })
      await writeFile(settingsPath, hooksSettingsContent, 'utf-8')
      return { path: configDir + 'settings.json', action: exists ? 'overwritten' : 'created' }
    }
  }
}

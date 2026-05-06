// Wizard 共享逻辑：Q1 路由、非交互回退、Stage 6 预览。

import { basename, resolve } from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import { TEMPLATE_CATEGORIES } from '../template-categories.js'
import { resolveProjectMode } from '../scanner/detect-project.js'
import { ProjectScanner } from '../scanner/project-scanner.js'
import { detectProject } from '../scanner/detect-project.js'
import { listPresets } from '../preset-loader.js'
import { fileExists } from '../fs-utils.js'
import type {
  InitCliOptions,
  ReadmeStrategy,
  WizardContext,
  WizardResult,
} from './init-types.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { ProjectMode } from '../scanner/detect-project.js'

export function isCancelled(value: unknown): boolean {
  return typeof value === 'symbol' || p.isCancel(value)
}

export async function buildWizardContext(
  cli: InitCliOptions,
  harnessRoot: string,
): Promise<WizardContext> {
  const scanner = new ProjectScanner()
  const scanResult = await scanner.scan(cli.targetDir)
  const detection = await detectProject(cli.targetDir, scanResult)
  const isInteractive = process.stdout.isTTY === true && !cli.yes
  return {
    targetDir: cli.targetDir,
    harnessRoot,
    scanResult,
    detection,
    cli,
    isInteractive,
  }
}

/** Q1：项目模式路由；非交互模式按 detection 自动推断 */
export async function routeProjectMode(ctx: WizardContext): Promise<ProjectMode | null> {
  const auto = resolveProjectMode(ctx.detection)
  if (!ctx.isInteractive) return auto

  const answer = await p.select({
    message: '本次要怎么使用 g-harness？',
    initialValue: auto,
    options: [
      { value: 'new' as const, label: '🆕 新建项目（为空目录生成完整规范 + 初始代码骨架）' },
      { value: 'existing' as const, label: '📂 已有项目（基于代码现状反演规范）' },
      { value: 'reinit' as const, label: '🔁 重新初始化（已有 g-harness，全量刷新模板）' },
    ],
  })
  if (isCancelled(answer)) return null
  return answer as ProjectMode
}

/** 按 id 列表解析 agent 选择；仅用于非交互模式 */
export function resolveAgentsFromCli(ids: string[] | undefined): AgentDefinition[] {
  if (!ids || ids.length === 0) {
    const claude = AGENT_REGISTRY.find((a) => a.id === 'claude')
    return claude ? [claude] : []
  }
  const result: AgentDefinition[] = []
  for (const id of ids) {
    const found = AGENT_REGISTRY.find((a) => a.id === id)
    if (found) result.push(found)
  }
  return result
}

export async function resolvePresetFromCli(
  harnessRoot: string,
  presetName: string | undefined,
): Promise<{ name: string; preset: Awaited<ReturnType<typeof listPresets>>[number] | null }> {
  if (!presetName) return { name: 'base', preset: null }
  const all = await listPresets(harnessRoot)
  const hit = all.find((p) => p.name === presetName)
  return { name: presetName, preset: hit ?? null }
}

/** Stage 6 预览 */
export async function previewAndConfirm(result: WizardResult, ctx: WizardContext): Promise<boolean> {
  const lines: string[] = []
  lines.push(pc.bold('即将生成：'))
  lines.push(`- 项目：${pc.cyan(result.meta.projectName)}`)
  lines.push(`- 目标目录：${pc.dim(ctx.targetDir)}`)
  lines.push(`- 选中的 agent：${result.agents.map((a) => a.name).join(', ') || '（无）'}`)
  lines.push(`- 预设：${pc.cyan(result.presetName)}`)
  lines.push(`- 模式：${pc.cyan(result.mode)}${result.depth ? `（深度 ${result.depth}）` : ''}`)
  const catLabels = Object.keys(result.templateSelection)
    .map((id) => TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? id)
    .join(', ')
  lines.push(`- 模板模块：${pc.cyan(catLabels)}`)
  lines.push(`- 冲突策略：${result.conflict}`)
  if (result.provider) lines.push(`- LLM 供应商：${result.provider}（模型 ${result.model ?? '默认'}）`)
  p.note(lines.join('\n'), 'Preview')

  if (!ctx.isInteractive) return true
  const confirmed = await p.confirm({ message: '确认继续？', initialValue: true })
  if (isCancelled(confirmed)) return false
  return confirmed === true
}

/** CLI 模式兼容：--llm / --deep-agent → --mode */
export function normalizeMode(cli: InitCliOptions): InitCliOptions {
  const next: InitCliOptions = { ...cli }
  // commander 的标志保留在 cli 里，需要调用方提前解析
  return next
}

/** 输出项目名推断：优先 cli.name → package.json → 目录名 */
export function inferProjectName(ctx: WizardContext): string {
  if (ctx.cli.name) return ctx.cli.name
  const dir = basename(resolve(ctx.targetDir))
  return dir || 'untitled'
}

/** 询问 README.md 处理策略：检测已有 README 时弹出确认 */
export async function askReadmeStrategy(targetDir: string): Promise<ReadmeStrategy | null> {
  const readmePath = resolve(targetDir, 'README.md')
  const exists = await fileExists(readmePath)
  if (!exists) return 'overwrite'

  const answer = await p.select({
    message: '检测到已有 README.md，如何处理？',
    initialValue: 'merge' as const,
    options: [
      { value: 'merge' as const, label: 'merge — 将规范信息追加到现有 README 末尾' },
      { value: 'skip' as const, label: 'skip — 保留原 README 不动' },
      { value: 'overwrite' as const, label: 'overwrite — 用模板全量替换' },
    ],
  })
  if (isCancelled(answer)) return null
  return answer as ReadmeStrategy
}

// init 交互式流程：6 阶段引导式 Wizard（ADR-007）

import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { ProjectDetection, ProjectMode } from '../scanner/detect-project.js'
import { resolveProjectMode } from '../scanner/detect-project.js'

// ── 公共类型 ──

export interface InteractiveResult {
  agents: AgentDefinition[]
  cancelled: boolean
}

export interface ProjectMeta {
  projectName: string
  projectDescription: string
  srcDir: string
}

export type ConflictStrategy = 'skip' | 'overwrite' | 'prompt'

export interface OutputConfig {
  full: boolean
  conflict: ConflictStrategy
  installHook: boolean
}

// ── Stage 1: 项目检测 + 分支路由 ──

export interface Stage1Result {
  mode: ProjectMode
  detection: ProjectDetection
  shouldContinue: boolean
}

export async function stage1DetectProject(detection: ProjectDetection): Promise<Stage1Result> {
  const mode = resolveProjectMode(detection)

  if (mode === 'new') {
    p.log.info(pc.cyan('检测到空目录，将以新项目模式初始化'))
  } else if (mode === 'reinit') {
    const version = detection.gforgeVersion
      ? ` (v${detection.gforgeVersion})`
      : ''
    const agents = detection.existingAgents.length > 0
      ? `，已配置 ${detection.existingAgents.join(', ')}`
      : ''
    p.log.warn(pc.yellow(`检测到已接入 G-Forge${version}${agents}`))
    p.log.info(pc.dim('建议使用 gforge context sync 更新现有配置'))

    const shouldContinue = await p.confirm({
      message: '继续 init 将重新生成配置文件，是否继续？',
      initialValue: false,
    })

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      return { mode, detection, shouldContinue: false }
    }
  } else {
    const tech = detection.scanResult.techStack
    const parts: string[] = []
    if (tech.framework) parts.push(tech.framework)
    else if (tech.language) parts.push(tech.language)
    if (tech.buildTool) parts.push(tech.buildTool)
    if (tech.packageManager) parts.push(tech.packageManager)
    const desc = parts.length > 0 ? parts.join(' + ') : '未知技术栈'
    p.log.info(pc.cyan(`检测到已有项目：${desc}`))
  }

  return { mode, detection, shouldContinue: true }
}

// ── Stage 2: AI 助手选择 ──

function agentHint(agent: AgentDefinition): string {
  const caps: string[] = []
  if (agent.supportsHooks) caps.push('钩子')
  if (agent.supportsSkills) caps.push('技能')
  if (agent.supportsProtocols) caps.push('协议')
  if (agent.supportsGuardrails) caps.push('护栏')
  if (caps.length > 0) return `完整支持（规则/${caps.join('/')}）`
  if (agent.id === 'generic') return '仅生成 AGENTS.md，兼容所有 agent'
  return '支持规则'
}

export async function stage2SelectAgents(
  existingAgents?: string[],
): Promise<InteractiveResult> {
  const options = AGENT_REGISTRY.map((agent) => ({
    value: agent.id,
    label: `${agent.name}（${agent.vendor}）`,
    hint: agentHint(agent),
  }))

  // 智能预选：有现有配置时预选对应 agent，否则预选 claude
  const initialValues = existingAgents && existingAgents.length > 0
    ? existingAgents
    : ['claude']

  const selected = await p.multiselect({
    message: '选择你的 AI 开发助手（空格选择，回车确认）',
    options,
    initialValues,
    required: true,
  })

  if (p.isCancel(selected)) {
    p.cancel('已取消')
    return { agents: [], cancelled: true }
  }

  const agents = (selected as string[]).map((id) => {
    const agent = AGENT_REGISTRY.find((a) => a.id === id)
    if (!agent) throw new Error(`未知 agent: ${id}`)
    return agent
  })

  return { agents, cancelled: false }
}

// ── Stage 3: 技术栈 & 预设选择 ──

interface PresetOption {
  value: string
  label: string
  hint?: string
}

const PRESET_GROUPS: Array<{ group: string; presets: PresetOption[] }> = [
  {
    group: '前端框架',
    presets: [
      { value: 'nextjs', label: 'Next.js', hint: 'React 全栈，App Router' },
      { value: 'nuxt', label: 'Nuxt', hint: 'Vue 3 全栈，约定式路由' },
      { value: 'vite-react', label: 'React + Vite', hint: 'React 19 + Vite 6' },
      { value: 'vite-vue', label: 'Vue + Vite', hint: 'Vue 3 + Vite 6' },
      { value: 'vanilla', label: 'Vanilla', hint: '纯 HTML + JS' },
    ],
  },
  {
    group: '后端框架',
    presets: [
      { value: 'nestjs', label: 'NestJS', hint: 'TypeScript 企业级后端' },
      { value: 'express', label: 'Express / Hono / Fastify', hint: '轻量 Node.js 后端' },
      { value: 'fastapi', label: 'FastAPI', hint: 'Python 异步后端' },
    ],
  },
  {
    group: '桌面 & 移动',
    presets: [
      { value: 'electron', label: 'Electron', hint: '跨平台桌面应用' },
      { value: 'tauri', label: 'Tauri', hint: 'Rust + Web 桌面应用' },
      { value: 'react-native', label: 'React Native', hint: 'Expo 跨端移动应用' },
      { value: 'flutter', label: 'Flutter', hint: 'Dart 跨端应用' },
    ],
  },
  {
    group: '小程序 & 跨端',
    presets: [
      { value: 'miniprogram', label: '微信小程序', hint: '原生小程序开发' },
      { value: 'uniapp', label: 'uni-app', hint: 'Vue 3 跨端' },
    ],
  },
  {
    group: '工程化',
    presets: [
      { value: 'monorepo', label: 'Monorepo', hint: 'Turborepo / Nx' },
      { value: 'base', label: '通用基础', hint: '技术栈无关' },
    ],
  },
]

export async function stage3SelectPreset(
  detection: ProjectDetection,
  mode: ProjectMode,
): Promise<string | null> {
  // 已有项目：推荐预设 + 确认/修正
  if (mode !== 'new' && detection.scanResult.techStack.framework) {
    const recommended = detectPresetFromFramework(detection.scanResult.techStack.framework)
    const action = await p.select({
      message: `检测到 ${detection.scanResult.techStack.framework}，推荐预设：${recommended}`,
      options: [
        { value: 'accept', label: `使用推荐预设 ${recommended}` },
        { value: 'choose', label: '选择其他预设' },
        { value: 'none', label: '不使用预设（仅生成基础规范）' },
      ],
    })

    if (p.isCancel(action)) return null
    if (action === 'accept') return recommended
    if (action === 'none') return 'base'
    // fall through to full list
  }

  // 新建项目 或 用户选择"其他预设"：展示分组列表
  const allOptions: Array<{ value: string; label: string; hint?: string }> = []
  for (const group of PRESET_GROUPS) {
    allOptions.push({ value: `__group_${group.group}`, label: pc.dim(`── ${group.group} ──`), hint: '' })
    allOptions.push(...group.presets)
  }

  const selected = await p.select({
    message: '选择技术栈预设',
    options: allOptions.filter((o) => !o.value.startsWith('__group_')),
  })

  if (p.isCancel(selected)) return null
  return selected as string
}

function detectPresetFromFramework(framework: string): string {
  const map: Record<string, string> = {
    'next.js': 'nextjs',
    react: 'vite-react',
    vue: 'vite-vue',
    nuxt: 'nuxt',
    electron: 'electron',
    tauri: 'tauri',
    'react native': 'react-native',
    nestjs: 'nestjs',
    nest: 'nestjs',
    express: 'express',
    fastify: 'express',
    hono: 'express',
    angular: 'base',
    svelte: 'base',
  }
  return map[framework.toLowerCase()] ?? 'base'
}

// ── Stage 4: 项目元信息收集 ──

export async function stage4CollectMeta(
  detection: ProjectDetection,
): Promise<ProjectMeta | null> {
  const defaultName = await inferProjectName(detection)
  const defaultDesc = await inferProjectDescription(detection)
  const defaultSrc = detection.scanResult.structure.srcDir ?? 'src'

  const projectName = await p.text({
    message: '项目名称',
    placeholder: defaultName,
    defaultValue: defaultName,
  })
  if (p.isCancel(projectName)) return null

  const projectDescription = await p.text({
    message: '项目描述',
    placeholder: defaultDesc || '（可跳过）',
    defaultValue: defaultDesc,
  })
  if (p.isCancel(projectDescription)) return null

  const srcDir = await p.text({
    message: '源码目录',
    placeholder: defaultSrc,
    defaultValue: defaultSrc,
  })
  if (p.isCancel(srcDir)) return null

  return {
    projectName: projectName as string,
    projectDescription: (projectDescription as string) || '',
    srcDir: srcDir as string,
  }
}

async function inferProjectName(detection: ProjectDetection): Promise<string> {
  // 从 scanResult 获取 rootDir，取目录名
  const rootDir = detection.scanResult.structure.rootDir
  const dirName = rootDir.split(/[/\\]/).filter(Boolean).pop() ?? 'my-project'
  return dirName
}

async function inferProjectDescription(_detection: ProjectDetection): Promise<string> {
  return ''
}

// ── Stage 5: 输出配置 ──

export async function stage5OutputConfig(
  mode: ProjectMode,
): Promise<OutputConfig | null> {
  const layer = await p.select({
    message: '选择输出层级',
    options: [
      { value: 'core', label: '核心层（推荐）', hint: '规则 + 协议 + 入口文件 + 架构文档' },
      { value: 'full', label: '完整层', hint: '核心层 + 护栏 + 技能 + Prompt + 任务看板 + 运维手册' },
    ],
  })
  if (p.isCancel(layer)) return null

  let conflict: ConflictStrategy = 'skip'
  if (mode === 'existing' || mode === 'reinit') {
    const conflictChoice = await p.select({
      message: '已有文件冲突策略',
      options: [
        { value: 'skip', label: '跳过已有文件（安全默认）' },
        { value: 'overwrite', label: '覆盖所有文件' },
        { value: 'prompt', label: '逐个确认（适合精细控制）' },
      ],
    })
    if (p.isCancel(conflictChoice)) return null
    conflict = conflictChoice as ConflictStrategy
  }

  const installHook = await p.confirm({
    message: '安装 pre-commit hook？（提交前自动校验）',
    initialValue: true,
  })
  if (p.isCancel(installHook)) return null

  return {
    full: layer === 'full',
    conflict,
    installHook: installHook as boolean,
  }
}

// ── 工具函数 ──

export function printAgentSummary(agents: AgentDefinition[]): void {
  const names = agents.map((a) => a.name).join(', ')
  console.log(pc.cyan(`AI 助手: ${names}`))

  const limited = agents.filter((a) => a.id !== 'claude' && a.id !== 'generic')
  if (limited.length > 0) {
    const limitedNames = limited.map((a) => a.name).join('、')
    console.log(pc.dim(`提示: ${limitedNames} 仅支持规则文件，钩子/协议/技能等高级功能仅 Claude Code 可用`))
  }
}

// ── Stage 6: 确认预览 ──

export interface PreviewSummary {
  agents: AgentDefinition[]
  presetName: string
  full: boolean
  conflict: ConflictStrategy
  installHook: boolean
  meta: ProjectMeta
  filesToCreate: string[]
}

export async function stage6Confirm(summary: PreviewSummary): Promise<boolean> {
  const agentNames = summary.agents.map((a) => a.name).join(', ')

  p.log.step(pc.bold('即将生成以下配置：'))
  console.log()
  console.log(`  ${pc.dim('AI 助手：')}${pc.cyan(agentNames)}`)
  console.log(`  ${pc.dim('技术预设：')}${pc.cyan(summary.presetName)}`)
  console.log(`  ${pc.dim('输出层级：')}${pc.cyan(summary.full ? '完整层' : '核心层')}`)
  console.log(`  ${pc.dim('冲突策略：')}${pc.cyan(formatConflict(summary.conflict))}`)
  console.log(`  ${pc.dim('项目名称：')}${pc.cyan(summary.meta.projectName)}`)
  console.log()

  const fileCount = summary.filesToCreate.length
  const displayLimit = 15
  console.log(`  ${pc.dim(`将创建 ${fileCount} 个文件：`)}`)
  const shown = summary.filesToCreate.slice(0, displayLimit)
  for (const f of shown) {
    console.log(`  ${pc.green(`+ ${f}`)}`)
  }
  if (fileCount > displayLimit) {
    console.log(`  ${pc.dim(`  ...（+${fileCount - displayLimit} 个文件）`)}`)
  }
  console.log()

  const confirmed = await p.confirm({
    message: '确认生成？',
    initialValue: true,
  })

  if (p.isCancel(confirmed)) return false
  return confirmed as boolean
}

function formatConflict(strategy: ConflictStrategy): string {
  const labels: Record<ConflictStrategy, string> = {
    skip: '跳过已有',
    overwrite: '覆盖所有',
    prompt: '逐个确认',
  }
  return labels[strategy]
}

// 旧版兼容导出
export async function selectAgents(): Promise<InteractiveResult> {
  return stage2SelectAgents()
}

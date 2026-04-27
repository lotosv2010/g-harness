// init 交互式流程：6 阶段引导式 Wizard（ADR-007）

import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { ProjectDetection, ProjectMode } from '../scanner/detect-project.js'
import { resolveProjectMode } from '../scanner/detect-project.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'
import { loadDeepAgentDeps } from '../agents/deep-agent/lazy-import.js'
import { estimateRun, formatEstimate } from '../agents/deep-agent/preflight.js'
import { getModelChoices } from '../agents/deep-agent/config.js'
import type { GenerateMode } from '../generator/file-generator.js'

// ── 公共类型 ──

import { autoDescribe } from '../analyzer/index.js'

export interface InteractiveResult {
  agents: AgentDefinition[]
  cancelled: boolean
}

export interface ProjectMeta {
  projectName: string
  projectDescription: string
  srcDir: string
  /** 用户填写的技术栈自由文本（逗号分隔，如 "TypeScript, React, Next.js, Tailwind CSS"） */
  techStack?: string
  /** 元信息来源：manual（用户输入）或 auto（从 package.json/README 自动推导） */
  source: 'manual' | 'auto'
  /** auto 模式下的证据来源 */
  autoSources?: string[]
}

export type ConflictStrategy = 'skip' | 'overwrite' | 'prompt'

export interface OutputConfig {
  full: boolean
  conflict: ConflictStrategy
  installHook: boolean
  /** 是否启用 LLM 内容增强（需要 ANTHROPIC_API_KEY 或 OPENAI_API_KEY） */
  useLlm: boolean
  /** 生成模式（v1.4）：template / llm-enhance / deep-agent */
  mode: GenerateMode
  /** deep-agent 模式下的分析深度 */
  depth?: Depth
  /** 用户在 Stage 5 选择的 provider（llm-enhance / deep-agent 时生效，ADR-011） */
  provider?: AgentProvider
  /** 用户在 Stage 5 选择的模型 ID（ADR-011） */
  model?: string
  /** 用户通过 p.password 输入的 API Key；env 已存在则为 undefined（ADR-011） */
  apiKey?: string
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
    const version = detection.harnessVersion
      ? ` (v${detection.harnessVersion})`
      : ''
    const agents = detection.existingAgents.length > 0
      ? `，已配置 ${detection.existingAgents.join(', ')}`
      : ''
    p.log.warn(pc.yellow(`检测到已接入 G-Harness${version}${agents}`))
    p.log.info(pc.dim('建议使用 g-harness context sync 更新现有配置'))

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

// ── Stage 3: 技术栈自由文本输入（B 方案） ──

export interface Stage3Result {
  /** 用户输入的技术栈原文（逗号分隔） */
  techStack: string
  /** 从技术栈文本反推出的预设名（内部使用，用于加载模板变量） */
  inferredPreset: string
}

/**
 * Stage 3：让用户自由输入技术栈，内部自动反推预设。
 * 老项目：默认值来自 scanner（如 "Next.js, TypeScript, pnpm"）
 * 新项目：placeholder 给一组常见组合作参考
 */
export async function stage3TechStack(
  detection: ProjectDetection,
  mode: ProjectMode,
): Promise<Stage3Result | null> {
  const scanned = detection.scanResult.techStack
  const defaultStack = mode === 'new' ? '' : formatScannedStack(scanned)
  const placeholder = mode === 'new'
    ? '例如：TypeScript, React, Next.js, Tailwind CSS'
    : defaultStack || '例如：TypeScript, React, Next.js, Tailwind CSS'

  const input = await p.text({
    message: '请输入计划使用的技术栈（逗号分隔）',
    placeholder,
    defaultValue: defaultStack,
    validate: (value) => {
      if (!value || value.trim().length === 0) return '至少输入一项技术'
      return undefined
    },
  })
  if (p.isCancel(input)) return null

  const techStack = (input as string).trim()
  const inferredPreset = inferPresetFromText(techStack, scanned.framework)

  if (mode !== 'new' && inferredPreset !== 'base') {
    p.log.info(pc.dim(`已识别预设：${inferredPreset}（内部用于加载模板片段库）`))
  }

  return { techStack, inferredPreset }
}

/** 将扫描到的技术栈格式化为一行逗号分隔的默认值 */
function formatScannedStack(t: ProjectDetection['scanResult']['techStack']): string {
  const parts: string[] = []
  if (t.framework) parts.push(t.framework)
  if (t.language) parts.push(t.language)
  if (t.buildTool) parts.push(t.buildTool)
  if (t.testRunner) parts.push(t.testRunner)
  if (t.packageManager) parts.push(t.packageManager)
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(', ')
}

/**
 * 从自由文本 + 扫描结果推断预设名。关键词优先级：
 * 用户文本显式提到 > scanner 识别的 framework > base 兜底
 */
export function inferPresetFromText(text: string, scannedFramework: string | null): string {
  const lower = text.toLowerCase()

  // 关键词映射（顺序敏感：特异性高的在前）
  const rules: Array<[RegExp, string]> = [
    [/\bnext(\.js)?\b/, 'nextjs'],
    [/\bnuxt(\.js)?\s?3?\b/, 'nuxt'],
    [/\bnest(\.js)?\b/, 'nestjs'],
    [/\breact[\s-]?native\b|\bexpo\b/, 'react-native'],
    [/\btauri\b/, 'tauri'],
    [/\belectron\b/, 'electron'],
    [/\bfastapi\b/, 'fastapi'],
    [/\bfastify\b|\bexpress\b|\bhono\b/, 'express'],
    [/\bflutter\b|\bdart\b/, 'flutter'],
    [/\buni[\s-]?app\b/, 'uniapp'],
    [/\bmini[\s-]?program\b|微信小程序|小程序/, 'miniprogram'],
    [/\bturborepo\b|\bnx\b|\bmonorepo\b/, 'monorepo'],
    [/\bvue\b/, 'vite-vue'],
    [/\breact\b|\bvite\b/, 'vite-react'],
    [/\bvanilla\b|纯\s?html/, 'vanilla'],
  ]

  for (const [re, preset] of rules) {
    if (re.test(lower)) return preset
  }

  // 回退到扫描到的 framework
  if (scannedFramework) {
    const scanned = scannedFramework.toLowerCase()
    for (const [re, preset] of rules) {
      if (re.test(scanned)) return preset
    }
  }

  return 'base'
}

// ── Stage 4: 项目元信息收集 ──

export async function stage4CollectMeta(
  detection: ProjectDetection,
): Promise<ProjectMeta | null> {
  const mode = resolveProjectMode(detection)
  const defaultSrc = detection.scanResult.structure.srcDir ?? 'src'
  const rootDir = detection.scanResult.structure.rootDir

  // 老项目（existing / reinit）可选择"自动分析" vs "手动输入"
  if (mode !== 'new') {
    const auto = await autoDescribe(rootDir)
    if (auto.projectName || auto.description) {
      const choice = await p.select({
        message: '元信息收集方式',
        options: [
          {
            value: 'auto',
            label: '自动分析（从 package.json / README 提取）',
            hint: auto.sources.join(' + '),
          },
          { value: 'manual', label: '手动输入（逐项确认）' },
        ],
      })
      if (p.isCancel(choice)) return null

      if (choice === 'auto') {
        const name = auto.projectName || inferProjectNameFromDir(rootDir)
        const desc = auto.description ?? ''
        p.log.info(pc.cyan(`自动识别：${name}${desc ? ` — ${desc.slice(0, 60)}${desc.length > 60 ? '...' : ''}` : ''}`))
        return {
          projectName: name,
          projectDescription: desc,
          srcDir: defaultSrc,
          source: 'auto',
          autoSources: auto.sources,
        }
      }
    }
  }

  // 手动输入路径（新项目或用户选择 manual）
  const auto = mode !== 'new' ? await autoDescribe(rootDir) : null
  const defaultName = auto?.projectName || inferProjectNameFromDir(rootDir)
  const defaultDesc = auto?.description ?? ''

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
    source: 'manual',
  }
}

function inferProjectNameFromDir(rootDir: string): string {
  const dirName = rootDir.split(/[/\\]/).filter(Boolean).pop() ?? 'my-project'
  return dirName
}

// ── Stage 5: 输出配置 ──

export interface Stage5Context {
  targetDir: string
}

export async function stage5OutputConfig(
  mode: ProjectMode,
  context?: Stage5Context,
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

  // 生成模式三选一（ADR-010 + ADR-011）：
  // template（默认）：零依赖，无 API 调用
  // llm-enhance：需 key；若 env 未设，交互输入
  // deep-agent：需 key + deepagents 依赖；若 env 未设，交互输入
  const deepAgentDepsOk = await isDeepAgentAvailable()

  const modeOptions: Array<{ value: GenerateMode; label: string; hint?: string }> = [
    { value: 'template', label: '模板 + 规则补全（默认）', hint: '零成本、离线、确定性' },
    { value: 'llm-enhance', label: 'LLM 窄增强', hint: '仅改写 SPEC 三段叙述' },
  ]
  if (deepAgentDepsOk) {
    modeOptions.push({
      value: 'deep-agent',
      label: 'Deep Agent 自主生成（v1.4）',
      hint: '读项目 → 自主产出完整规范（含成本）',
    })
  } else {
    p.log.info(
      pc.dim('Deep Agent 依赖未安装：pnpm add -D deepagents @langchain/core @langchain/langgraph @langchain/anthropic @langchain/openai zod'),
    )
  }

  const modeChoice = await p.select({
    message: '选择生成模式',
    options: modeOptions,
    initialValue: 'template' as GenerateMode,
  })
  if (p.isCancel(modeChoice)) return null
  const selectedMode = modeChoice as GenerateMode

  // Provider / Model / API Key 采集（仅 llm-enhance / deep-agent 需要）
  let provider: AgentProvider | undefined
  let model: string | undefined
  let apiKey: string | undefined

  // Depth 选择前置给 deep-agent，便于后续 model 列表按 depth 标注推荐
  let depth: Depth | undefined
  if (selectedMode === 'deep-agent') {
    const depthChoice = await p.select({
      message: '选择 Deep Agent 分析深度',
      options: [
        { value: 'shallow', label: '浅层', hint: '≤15k token / ~20s；仅读索引 + package + README' },
        { value: 'medium', label: '中层（推荐）', hint: '≤50k token / ~40s；增加 list_dir + read_file' },
        { value: 'deep', label: '深层', hint: '≤150k token / ~90s；加 grep + 全量反演' },
      ],
      initialValue: 'medium' as Depth,
    })
    if (p.isCancel(depthChoice)) return null
    depth = depthChoice as Depth
  }

  if (selectedMode === 'llm-enhance' || selectedMode === 'deep-agent') {
    const creds = await pickProviderModelKey(depth)
    if (!creds) return null
    provider = creds.provider
    model = creds.model
    apiKey = creds.apiKey

    // deep-agent 预估（model 已选定后再算，provider 跟随用户选择）
    if (selectedMode === 'deep-agent' && depth && context?.targetDir) {
      try {
        const estimate = await estimateRun({ targetDir: context.targetDir, depth })
        p.log.info(pc.dim(formatEstimate(estimate, provider)))
      } catch {
        // preflight 失败不阻塞
      }
    }
  }

  const useLlm = selectedMode === 'llm-enhance'

  return {
    full: layer === 'full',
    conflict,
    installHook: installHook as boolean,
    useLlm,
    mode: selectedMode,
    depth,
    provider,
    model,
    apiKey,
  }
}

// ── Stage 5 辅助：provider / model / API key 三步选择（ADR-011） ──

interface CredentialChoice {
  provider: AgentProvider
  model: string
  /** env 已存在时为 undefined（上层直读 env），交互输入时为用户录入值 */
  apiKey?: string
}

/**
 * 选定 provider → model → API key。取消返回 null。
 * - provider：两个 env 都设时让用户选；仅一个 env 则自动；两个都未设则让用户先选 provider 再输 key
 * - model：按 provider 展示 ModelChoice 列表，标注当前 depth 推荐
 * - apiKey：env 已有则跳过 + dim 提示；未设则 p.password 输入（会话内使用）
 */
async function pickProviderModelKey(depth?: Depth): Promise<CredentialChoice | null> {
  const hasAnth = Boolean(process.env.ANTHROPIC_API_KEY)
  const hasOai = Boolean(process.env.OPENAI_API_KEY)

  let provider: AgentProvider
  if (hasAnth && !hasOai) {
    provider = 'anthropic'
    p.log.info(pc.dim('检测到 ANTHROPIC_API_KEY，使用 Anthropic'))
  } else if (hasOai && !hasAnth) {
    provider = 'openai'
    p.log.info(pc.dim('检测到 OPENAI_API_KEY，使用 OpenAI'))
  } else {
    // 两个都有 或 两个都无：让用户选
    const pick = await p.select({
      message: '选择 LLM 供应商',
      options: [
        { value: 'anthropic', label: 'Anthropic（Claude）', hint: hasAnth ? 'env 已设' : 'env 未设，后续交互输入 key' },
        { value: 'openai', label: 'OpenAI（GPT）', hint: hasOai ? 'env 已设' : 'env 未设，后续交互输入 key' },
      ],
      initialValue: hasAnth ? 'anthropic' : ('openai' as AgentProvider),
    })
    if (p.isCancel(pick)) return null
    provider = pick as AgentProvider
  }

  // 模型列表（按 depth 标注推荐）
  const choices = getModelChoices(provider)
  const modelOptions = choices.map((c) => {
    const isRecommended = depth && c.recommendedFor?.includes(depth)
    return {
      value: c.id,
      label: c.label,
      hint: isRecommended ? `${depth} 档推荐` : undefined,
    }
  })
  const defaultModel = depth
    ? choices.find((c) => c.recommendedFor?.includes(depth))?.id ?? choices[0].id
    : choices[0].id

  const modelPick = await p.select({
    message: '选择模型',
    options: modelOptions,
    initialValue: defaultModel,
  })
  if (p.isCancel(modelPick)) return null
  const model = modelPick as string

  // API Key
  const envKeyName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
  const envKey = process.env[envKeyName]
  let apiKey: string | undefined
  if (envKey) {
    p.log.info(pc.dim(`沿用 ${envKeyName}（masked: ${maskKey(envKey)}）`))
  } else {
    const input = await p.password({
      message: `输入 ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API Key（仅本次会话使用，不会写盘）`,
      validate: (value) => {
        if (!value || value.trim().length < 10) return 'API Key 长度不足，请检查'
        return undefined
      },
    })
    if (p.isCancel(input)) return null
    apiKey = (input as string).trim()
  }

  return { provider, model, apiKey }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

async function isDeepAgentAvailable(): Promise<boolean> {
  try {
    const r = await loadDeepAgentDeps()
    return r.ok
  } catch {
    return false
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
  useLlm?: boolean
  /** 生成模式（v1.4），缺省等同 'template' */
  mode?: GenerateMode
  /** deep-agent 深度 */
  depth?: Depth
  /** deep-agent 预估报告（费用/token/耗时） */
  estimateLine?: string
  meta: ProjectMeta
  filesToCreate: string[]
}

export async function stage6Confirm(summary: PreviewSummary): Promise<boolean> {
  const agentNames = summary.agents.map((a) => a.name).join(', ')
  const mode: GenerateMode = summary.mode ?? 'template'

  p.log.step(pc.bold('即将生成以下配置：'))
  console.log()
  console.log(`  ${pc.dim('AI 助手：')}${pc.cyan(agentNames)}`)
  console.log(`  ${pc.dim('技术预设：')}${pc.cyan(summary.presetName)}`)
  console.log(`  ${pc.dim('输出层级：')}${pc.cyan(summary.full ? '完整层' : '核心层')}`)
  console.log(`  ${pc.dim('冲突策略：')}${pc.cyan(formatConflict(summary.conflict))}`)
  console.log(`  ${pc.dim('生成模式：')}${pc.cyan(formatMode(mode, summary.depth))}`)
  if (mode === 'deep-agent' && summary.estimateLine) {
    console.log(`  ${pc.dim('预估：')}${pc.cyan(summary.estimateLine)}`)
    console.log(`  ${pc.dim('降级策略：')}${pc.cyan('deep-agent → llm-enhance → template（任一失败自动下沉）')}`)
  }
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

function formatMode(mode: GenerateMode, depth?: Depth): string {
  if (mode === 'template') return '模板 + 规则补全'
  if (mode === 'llm-enhance') return 'LLM 窄增强'
  return `Deep Agent 自主生成（${depth ?? 'medium'}）`
}

// 旧版兼容导出
export async function selectAgents(): Promise<InteractiveResult> {
  return stage2SelectAgents()
}

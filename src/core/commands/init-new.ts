// 新建项目 9 问线性 Wizard（v0.2.0）

import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import { listPresets } from '../preset-loader.js'
import { getModelChoices, DEFAULT_MODELS } from '../agents/deep-agent/config.js'
import { isCancelled, inferProjectName } from './init-shared.js'
import type {
  WizardContext,
  WizardResult,
  GenerateMode,
} from './init-types.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { Preset } from '../preset-loader.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'

export async function runNewProjectWizard(ctx: WizardContext): Promise<WizardResult | null> {
  if (!ctx.isInteractive) return buildNonInteractiveResult(ctx)

  // Q2：选 agent（多选）
  const agents = await askAgents()
  if (!agents) return null

  // Q3：项目名
  const projectName = await askProjectName(ctx)
  if (projectName === null) return null

  // Q4：源码目录
  const srcDir = await askSrcDir()
  if (srcDir === null) return null

  // Q5：一句话定位
  const projectDescription = await askDescription()
  if (projectDescription === null) return null

  // Q6：预设 + 技术栈
  const presetPick = await askPreset(ctx.harnessRoot)
  if (!presetPick) return null
  const techStackText = await askTechStack(presetPick.preset)
  if (techStackText === null) return null

  // Q7：是否启用 LLM 增强
  const enableLlm = await p.confirm({
    message: '是否启用 LLM 增强分析？',
    initialValue: false,
  })
  if (isCancelled(enableLlm)) return null

  let mode: GenerateMode = 'template'
  let depth: Depth | undefined
  let provider: AgentProvider | undefined
  let model: string | undefined
  let apiKey: string | undefined

  if (enableLlm === true) {
    mode = 'deep-agent'

    // Q7.5：depth
    depth = ctx.cli.depth
    if (!depth) {
      const d = await p.select({
        message: '选择 Deep Agent 分析深度',
        initialValue: 'medium',
        options: [
          { value: 'shallow', label: 'shallow — 只读索引，~30s，$0.00–0.01' },
          { value: 'medium', label: 'medium（推荐） — 抽样分析，~2min，$0.01–0.05' },
          { value: 'deep', label: 'deep — 全仓反演，~5min，$0.05–0.20' },
        ],
      })
      if (isCancelled(d)) return null
      depth = d as Depth
    }

    // Q8: provider
    const prov = await p.select({
      message: '选择 LLM 供应商',
      initialValue: 'anthropic',
      options: [
        { value: 'anthropic', label: 'Anthropic（Claude）' },
        { value: 'openai', label: 'OpenAI（GPT）' },
      ],
    })
    if (isCancelled(prov)) return null
    provider = prov as AgentProvider

    // Q9: model（严格列表）
    const choices = getModelChoices(provider)
    const mdl = await p.select({
      message: '选择模型',
      initialValue: DEFAULT_MODELS[depth][provider],
      options: choices.map((c) => ({ value: c.id, label: c.label })),
    })
    if (isCancelled(mdl)) return null
    model = mdl as string

    // Q10: api key（password）
    const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
    const existing = process.env[envVar]
    if (existing) {
      p.log.info(`已从环境变量 ${envVar} 读取 API key`)
      apiKey = existing
    } else {
      const key = await p.password({
        message: `输入 ${envVar}（输入会被遮蔽；也可留空并通过 env 提供）`,
      })
      if (isCancelled(key)) return null
      const trimmed = (key as string | undefined)?.trim() ?? ''
      if (trimmed) {
        apiKey = trimmed
        p.log.warn(pc.yellow('⚠ 通过参数传入的 API key 可能被 shell history 记录'))
      }
    }

    if (ctx.cli.mode === 'llm-enhance') {
      mode = 'llm-enhance'
    }
  }

  return {
    agents,
    preset: presetPick.preset,
    presetName: presetPick.name,
    meta: {
      projectName,
      projectDescription,
      srcDir,
      techStackText,
    },
    mode,
    depth,
    conflict: ctx.cli.conflict ?? 'prompt',
    full: ctx.cli.full,
    installHook: false,
    provider,
    model,
    apiKey,
  }
}

async function askAgents(): Promise<AgentDefinition[] | null> {
  const opts = AGENT_REGISTRY.filter((a) => a.id !== 'generic').map((a) => ({
    value: a.id,
    label: `${a.name}（${a.vendor}）`,
  }))
  const picked = await p.multiselect({
    message: '选择要接入的 AI agent（空格多选，回车确认）',
    options: opts,
    required: true,
    initialValues: ['claude'],
  })
  if (isCancelled(picked)) return null
  const ids = picked as string[]
  const out: AgentDefinition[] = []
  for (const id of ids) {
    const hit = AGENT_REGISTRY.find((a) => a.id === id)
    if (hit) out.push(hit)
  }
  return out
}

async function askProjectName(ctx: WizardContext): Promise<string | null> {
  const defaultName = inferProjectName(ctx)
  const value = await p.text({
    message: '项目名？',
    placeholder: defaultName,
    defaultValue: defaultName,
  })
  if (isCancelled(value)) return null
  return ((value as string) || defaultName).trim()
}

async function askSrcDir(): Promise<string | null> {
  const value = await p.text({
    message: '源码目录？',
    placeholder: 'src',
    defaultValue: 'src',
  })
  if (isCancelled(value)) return null
  return ((value as string) || 'src').trim()
}

async function askDescription(): Promise<string | null> {
  const value = await p.text({
    message: '一句话描述这个项目的定位',
    placeholder: '如：面向内部团队的私域数据看板',
  })
  if (isCancelled(value)) return null
  return ((value as string) || '').trim()
}

async function askPreset(
  harnessRoot: string,
): Promise<{ name: string; preset: Preset } | null> {
  const presets = await listPresets(harnessRoot)
  if (presets.length === 0) return null
  const picked = await p.select({
    message: '选择技术栈预设',
    initialValue: 'base',
    options: presets.map((p) => ({ value: p.name, label: p.label })),
  })
  if (isCancelled(picked)) return null
  const name = picked as string
  const preset = presets.find((x) => x.name === name)
  if (!preset) return null
  return { name, preset }
}

async function askTechStack(preset: Preset): Promise<string | null> {
  const defaults = Object.values(preset.techStack).filter(Boolean).join(', ')
  const value = await p.text({
    message: '技术栈（逗号分隔，可留空使用预设默认）',
    placeholder: defaults,
  })
  if (isCancelled(value)) return null
  return ((value as string) || defaults).trim()
}

function buildNonInteractiveResult(ctx: WizardContext): WizardResult {
  const claude = AGENT_REGISTRY.find((a) => a.id === 'claude')
  const projectName = inferProjectName(ctx)
  const mode: GenerateMode = ctx.cli.mode ?? 'template'
  return {
    agents: claude ? [claude] : [],
    preset: null,
    presetName: ctx.cli.preset ?? 'base',
    meta: {
      projectName,
      projectDescription: `${projectName} 项目`,
      srcDir: 'src',
      techStackText: '',
    },
    mode,
    depth: ctx.cli.depth,
    conflict: ctx.cli.conflict ?? 'skip',
    full: ctx.cli.full,
    installHook: false,
    provider: ctx.cli.provider,
    model: ctx.cli.model,
    apiKey: ctx.cli.apiKey,
  }
}

// 已有项目 7 阶段 Wizard（re-author）

import * as p from '@clack/prompts'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import { detectPreset, listPresets, loadPreset } from '../preset-loader.js'
import { autoDescribe } from '../analyzer/auto-describe.js'
import {
  ALL_PROVIDERS,
  DEFAULT_MODELS,
  PROVIDER_REGISTRY,
  detectDefaultProvider,
  getModelChoices,
  readProviderEnv,
} from '../agents/deep-agent/config.js'
import { buildDefaultSelection } from '../template-categories.js'
import { askTemplateCategories } from './init-categories.js'
import pc from 'picocolors'
import { isCancelled, inferProjectName } from './init-shared.js'
import type { WizardContext, WizardResult, GenerateMode } from './init-types.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { Preset } from '../preset-loader.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'

interface LlmConfig {
  mode: GenerateMode
  depth?: Depth
  provider?: AgentProvider
  model?: string
  apiKey?: string
  baseUrl?: string
}

export async function runExistingProjectWizard(
  ctx: WizardContext,
  isReinit: boolean,
): Promise<WizardResult | null> {
  if (!ctx.isInteractive) return buildNonInteractiveResult(ctx, isReinit)

  const agents = await askAgents(ctx)
  if (!agents) return null

  const auto = await autoDescribe({ targetDir: ctx.targetDir, scanResult: ctx.scanResult })
  const projectName = await askProjectName(ctx, auto.projectName)
  if (projectName === null) return null

  const projectDescription = await askDescription(auto.projectDescription)
  if (projectDescription === null) return null

  const presetPick = await resolvePreset(ctx)
  if (!presetPick) return null

  const templateSelection = await askTemplateCategories(agents)
  if (templateSelection === null) return null

  const conflict = await askConflictStrategy(isReinit)
  if (conflict === null) return null

  const llm = await askLlmConfig(ctx)
  if (llm === null) return null

  return {
    agents,
    preset: presetPick.preset,
    presetName: presetPick.name,
    meta: {
      projectName,
      projectDescription,
      srcDir: ctx.scanResult.structure.srcDir ?? 'src',
      techStackText: auto.techStackText,
    },
    mode: llm.mode,
    depth: llm.depth,
    templateSelection,
    conflict,
    full: ctx.cli.full,
    installHook: false,
    provider: llm.provider,
    model: llm.model,
    apiKey: llm.apiKey,
    baseUrl: llm.baseUrl,
  }
}

async function askAgents(ctx: WizardContext): Promise<AgentDefinition[] | null> {
  const existing = new Set(ctx.detection.existingAgents)
  const initialValues = existing.size > 0 ? [...existing] : ['claude']
  const opts = AGENT_REGISTRY.filter((a) => a.id !== 'generic').map((a) => ({
    value: a.id,
    label: `${a.name}（${a.vendor}）${existing.has(a.id) ? ' ✓ 已检测到' : ''}`,
  }))
  const picked = await p.multiselect({
    message: '要接入的 AI agent',
    options: opts,
    required: true,
    initialValues,
  })
  if (isCancelled(picked)) return null
  const ids = picked as string[]
  return ids.map((id) => AGENT_REGISTRY.find((a) => a.id === id)).filter((a): a is AgentDefinition => !!a)
}

async function askProjectName(ctx: WizardContext, auto: string): Promise<string | null> {
  const defaultName = auto || inferProjectName(ctx)
  const value = await p.text({
    message: '确认项目名',
    placeholder: defaultName,
    defaultValue: defaultName,
  })
  if (isCancelled(value)) return null
  return ((value as string) || defaultName).trim()
}

async function askDescription(auto: string): Promise<string | null> {
  const value = await p.text({
    message: '确认项目一句话定位',
    placeholder: auto || '（请补充）',
    defaultValue: auto,
  })
  if (isCancelled(value)) return null
  return ((value as string) || auto).trim()
}

async function askConflictStrategy(isReinit: boolean): Promise<WizardResult['conflict'] | null> {
  const conflict = await p.select({
    message: '如何处理已存在的同名文件？',
    initialValue: isReinit ? 'skip' : 'prompt',
    options: [
      { value: 'skip', label: 'skip — 保留现有文件（推荐 reinit 使用）' },
      { value: 'overwrite', label: 'overwrite — 直接覆盖' },
      { value: 'prompt', label: 'prompt — 逐个询问' },
    ],
  })
  if (isCancelled(conflict)) return null
  return conflict as WizardResult['conflict']
}

/** Stage 5：LLM 增强配置 —— 按 enable / depth / provider / model / credential 顺序收集 */
async function askLlmConfig(ctx: WizardContext): Promise<LlmConfig | null> {
  const enableLlm = await p.confirm({ message: '启用 LLM 增强分析？', initialValue: false })
  if (isCancelled(enableLlm)) return null
  if (enableLlm !== true) return { mode: 'template' }

  const mode: GenerateMode = ctx.cli.mode === 'llm-enhance' ? 'llm-enhance' : 'deep-agent'

  const depth = mode === 'deep-agent' ? await resolveDepth(ctx) : undefined
  if (mode === 'deep-agent' && depth === null) return null

  const provider = await selectProvider()
  if (provider === null) return null

  const providerCfg = PROVIDER_REGISTRY[provider]
  const envVals = readProviderEnv(provider, process.env)

  const model = await selectModel(provider, depth ?? 'medium', envVals.model)
  if (model === null) return null

  const apiKey = await collectApiKey(provider, envVals.apiKey)
  if (apiKey === null) return null

  const baseUrl = await collectBaseUrl(providerCfg, envVals.baseUrl)
  if (baseUrl === null) return null

  return { mode, depth: depth ?? undefined, provider, model, apiKey, baseUrl }
}

async function resolveDepth(ctx: WizardContext): Promise<Depth | null> {
  if (ctx.cli.depth) return ctx.cli.depth
  const d = await p.select({
    message: '选择 Deep Agent 分析深度',
    initialValue: 'medium',
    options: [
      { value: 'shallow', label: 'shallow — 只读索引' },
      { value: 'medium', label: 'medium（推荐） — 抽样分析' },
      { value: 'deep', label: 'deep — 全仓反演' },
    ],
  })
  if (isCancelled(d)) return null
  return d as Depth
}

async function selectProvider(): Promise<AgentProvider | null> {
  const defaultProv = detectDefaultProvider(process.env) ?? 'anthropic'
  const prov = await p.select({
    message: '选择 LLM 供应商',
    initialValue: defaultProv,
    options: ALL_PROVIDERS.map((pid) => ({
      value: pid,
      label: PROVIDER_REGISTRY[pid].label,
    })),
  })
  if (isCancelled(prov)) return null
  return prov as AgentProvider
}

async function selectModel(
  provider: AgentProvider,
  depth: Depth,
  envModel: string | undefined,
): Promise<string | null> {
  const choices = getModelChoices(provider)
  const initialModel = envModel ?? DEFAULT_MODELS[depth][provider]
  const mdl = await p.select({
    message: '选择模型',
    initialValue: initialModel,
    options: choices.map((c) => ({ value: c.id, label: c.label })),
  })
  if (isCancelled(mdl)) return null
  return mdl as string
}

/** 返回 null = 取消；undefined = 未配置（合法）；字符串 = 收集到的 key */
async function collectApiKey(
  provider: AgentProvider,
  envKey: string | undefined,
): Promise<string | null | undefined> {
  const providerCfg = PROVIDER_REGISTRY[provider]
  if (!providerCfg.requiresApiKey) {
    p.log.info(`${providerCfg.label} 无需 API key`)
    return undefined
  }

  const envVar = providerCfg.apiKeyEnvVars[0]
  if (envKey) {
    p.log.info(`已从环境变量 ${envVar} 读取 API key`)
    return envKey
  }

  const key = await p.password({
    message: `输入 ${envVar}（输入会被遮蔽；可留空）`,
  })
  if (isCancelled(key)) return null
  const trimmed = (key as string | undefined)?.trim() ?? ''
  if (!trimmed) return undefined
  p.log.warn(pc.yellow('⚠ 通过参数传入的 API key 可能被 shell history 记录'))
  return trimmed
}

async function collectBaseUrl(
  providerCfg: (typeof PROVIDER_REGISTRY)[AgentProvider],
  envBaseUrl: string | undefined,
): Promise<string | null | undefined> {
  if (providerCfg.baseUrlEnvVars.length === 0 && !providerCfg.defaultBaseUrl) {
    return undefined
  }
  const defaultBase = envBaseUrl ?? providerCfg.defaultBaseUrl ?? ''
  const urlInput = await p.text({
    message: `${providerCfg.label} base URL（回车使用默认）`,
    placeholder: defaultBase || '留空',
    defaultValue: defaultBase,
  })
  if (isCancelled(urlInput)) return null
  const urlTrimmed = ((urlInput as string) || defaultBase).trim()
  return urlTrimmed || undefined
}

/**
 * 已有项目默认自动推断 preset；用户显式 --preset 时以 CLI 为准；
 * 推断失败或用户主动要改，才回退到选单。
 */
async function resolvePreset(
  ctx: WizardContext,
): Promise<{ name: string; preset: Preset } | null> {
  const presets = await listPresets(ctx.harnessRoot)
  if (presets.length === 0) return null

  if (ctx.cli.preset) {
    const hit = presets.find((x) => x.name === ctx.cli.preset)
    if (hit) {
      p.log.info(`已通过 --preset 指定：${pc.cyan(hit.label)}`)
      return { name: hit.name, preset: hit }
    }
    p.log.warn(`CLI 指定的预设 "${ctx.cli.preset}" 未找到，回退到自动推断`)
  }

  const detected = await detectPreset(ctx.harnessRoot, ctx.targetDir)
  const detectedPreset = detected ? presets.find((x) => x.name === detected) : null

  if (!ctx.isInteractive) {
    const fallback = detectedPreset ?? presets.find((x) => x.name === 'base') ?? presets[0]
    if (!fallback) return null
    return { name: fallback.name, preset: fallback }
  }

  if (detectedPreset) {
    const confirmed = await p.confirm({
      message: `检测到技术栈：${pc.cyan(detectedPreset.label)}，使用该预设？`,
      initialValue: true,
    })
    if (isCancelled(confirmed)) return null
    if (confirmed === true) return { name: detectedPreset.name, preset: detectedPreset }
  } else {
    p.log.warn('未能从 package.json 自动推断技术栈，请手动选择')
  }

  const picked = await p.select({
    message: '手动选择技术栈预设',
    initialValue: detectedPreset?.name ?? 'base',
    options: presets.map((x) => ({ value: x.name, label: x.label })),
  })
  if (isCancelled(picked)) return null
  const name = picked as string
  const preset = presets.find((x) => x.name === name) ?? (await loadPreset(ctx.harnessRoot, name))
  if (!preset) return null
  return { name, preset }
}

async function buildNonInteractiveResult(
  ctx: WizardContext,
  isReinit: boolean,
): Promise<WizardResult> {
  const claude = AGENT_REGISTRY.find((a) => a.id === 'claude')
  const projectName = inferProjectName(ctx)

  let presetName = ctx.cli.preset ?? 'base'
  let preset: Preset | null = null
  if (ctx.cli.preset) {
    preset = await loadPreset(ctx.harnessRoot, ctx.cli.preset)
  } else {
    const detected = await detectPreset(ctx.harnessRoot, ctx.targetDir)
    if (detected) {
      presetName = detected
      preset = await loadPreset(ctx.harnessRoot, detected)
    }
  }

  return {
    agents: claude ? [claude] : [],
    preset,
    presetName,
    meta: {
      projectName,
      projectDescription: `${projectName} 项目`,
      srcDir: ctx.scanResult.structure.srcDir ?? 'src',
      techStackText: '',
    },
    mode: ctx.cli.mode ?? 'template',
    depth: ctx.cli.depth,
    templateSelection: buildDefaultSelection(),
    conflict: ctx.cli.conflict ?? (isReinit ? 'skip' : 'prompt'),
    full: ctx.cli.full,
    installHook: false,
    provider: ctx.cli.provider,
    model: ctx.cli.model,
    apiKey: ctx.cli.apiKey,
    baseUrl: ctx.cli.baseUrl,
  }
}

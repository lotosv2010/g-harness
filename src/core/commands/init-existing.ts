// 已有项目 6 阶段 Wizard（re-author）

import * as p from '@clack/prompts'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import { listPresets } from '../preset-loader.js'
import { autoDescribe } from '../analyzer/auto-describe.js'
import {
  ALL_PROVIDERS,
  DEFAULT_MODELS,
  PROVIDER_REGISTRY,
  detectDefaultProvider,
  getModelChoices,
  readProviderEnv,
} from '../agents/deep-agent/config.js'
import pc from 'picocolors'
import { isCancelled, inferProjectName } from './init-shared.js'
import type { WizardContext, WizardResult, GenerateMode } from './init-types.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { Preset } from '../preset-loader.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'

export async function runExistingProjectWizard(
  ctx: WizardContext,
  isReinit: boolean,
): Promise<WizardResult | null> {
  if (!ctx.isInteractive) return buildNonInteractiveResult(ctx, isReinit)

  // Stage 1：agent
  const agents = await askAgents(ctx)
  if (!agents) return null

  // Stage 2：auto-describe + 复核
  const auto = await autoDescribe({ targetDir: ctx.targetDir, scanResult: ctx.scanResult })
  const projectName = await askProjectName(ctx, auto.projectName)
  if (projectName === null) return null

  const projectDescription = await askDescription(auto.projectDescription)
  if (projectDescription === null) return null

  // Stage 3：preset
  const presetPick = await askPreset(ctx)
  if (!presetPick) return null

  // Stage 4：conflict 策略（reinit 默认 skip）
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

  // Stage 5：LLM 增强
  const enableLlm = await p.confirm({ message: '启用 LLM 增强分析？', initialValue: false })
  if (isCancelled(enableLlm)) return null

  let mode: GenerateMode = 'template'
  let depth: Depth | undefined
  let provider: AgentProvider | undefined
  let model: string | undefined
  let apiKey: string | undefined
  let baseUrl: string | undefined

  if (enableLlm === true) {
    mode = ctx.cli.mode === 'llm-enhance' ? 'llm-enhance' : 'deep-agent'
    if (mode === 'deep-agent') {
      depth = ctx.cli.depth
      if (!depth) {
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
        depth = d as Depth
      }
    }

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
    provider = prov as AgentProvider
    const providerCfg = PROVIDER_REGISTRY[provider]
    const envVals = readProviderEnv(provider, process.env)

    const choices = getModelChoices(provider)
    const initialModel = envVals.model ?? DEFAULT_MODELS[depth ?? 'medium'][provider]
    const mdl = await p.select({
      message: '选择模型',
      initialValue: initialModel,
      options: choices.map((c) => ({ value: c.id, label: c.label })),
    })
    if (isCancelled(mdl)) return null
    model = mdl as string

    if (providerCfg.requiresApiKey) {
      const envVar = providerCfg.apiKeyEnvVars[0]
      if (envVals.apiKey) {
        p.log.info(`已从环境变量 ${envVar} 读取 API key`)
        apiKey = envVals.apiKey
      } else {
        const key = await p.password({
          message: `输入 ${envVar}（输入会被遮蔽；可留空）`,
        })
        if (isCancelled(key)) return null
        const trimmed = (key as string | undefined)?.trim() ?? ''
        if (trimmed) {
          apiKey = trimmed
          p.log.warn(pc.yellow('⚠ 通过参数传入的 API key 可能被 shell history 记录'))
        }
      }
    } else {
      p.log.info(`${providerCfg.label} 无需 API key`)
    }

    if (providerCfg.baseUrlEnvVars.length > 0 || providerCfg.defaultBaseUrl) {
      const defaultBase = envVals.baseUrl ?? providerCfg.defaultBaseUrl ?? ''
      const urlInput = await p.text({
        message: `${providerCfg.label} base URL（回车使用默认）`,
        placeholder: defaultBase || '留空',
        defaultValue: defaultBase,
      })
      if (isCancelled(urlInput)) return null
      const urlTrimmed = ((urlInput as string) || defaultBase).trim()
      if (urlTrimmed) baseUrl = urlTrimmed
    }
  }

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
    mode,
    depth,
    conflict: conflict as WizardResult['conflict'],
    full: ctx.cli.full,
    installHook: false,
    provider,
    model,
    apiKey,
    baseUrl,
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

async function askPreset(
  ctx: WizardContext,
): Promise<{ name: string; preset: Preset } | null> {
  const presets = await listPresets(ctx.harnessRoot)
  if (presets.length === 0) return null
  const picked = await p.select({
    message: '技术栈预设',
    initialValue: 'base',
    options: presets.map((p) => ({ value: p.name, label: p.label })),
  })
  if (isCancelled(picked)) return null
  const name = picked as string
  const preset = presets.find((x) => x.name === name)
  if (!preset) return null
  return { name, preset }
}

function buildNonInteractiveResult(ctx: WizardContext, isReinit: boolean): WizardResult {
  const claude = AGENT_REGISTRY.find((a) => a.id === 'claude')
  const projectName = inferProjectName(ctx)
  return {
    agents: claude ? [claude] : [],
    preset: null,
    presetName: ctx.cli.preset ?? 'base',
    meta: {
      projectName,
      projectDescription: `${projectName} 项目`,
      srcDir: ctx.scanResult.structure.srcDir ?? 'src',
      techStackText: '',
    },
    mode: ctx.cli.mode ?? 'template',
    depth: ctx.cli.depth,
    conflict: ctx.cli.conflict ?? (isReinit ? 'skip' : 'prompt'),
    full: ctx.cli.full,
    installHook: false,
    provider: ctx.cli.provider,
    model: ctx.cli.model,
    apiKey: ctx.cli.apiKey,
    baseUrl: ctx.cli.baseUrl,
  }
}

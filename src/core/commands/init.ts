import { Command } from 'commander'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { ProjectScanner } from '../scanner/project-scanner.js'
import { detectProject } from '../scanner/detect-project.js'
import { FileGenerator } from '../generator/file-generator.js'
import { installPreCommitHook } from '../generator/hook-installer.js'
import { loadPreset } from '../preset-loader.js'
import { getHarnessRoot } from '../paths.js'
import { getAgent, getAgentOrThrow, listAgentIds } from '../agents/agent-registry.js'
import {
  stage1DetectProject,
  stage2SelectAgents,
  stage3TechStack,
  stage4CollectMeta,
  stage5OutputConfig,
  stage6Confirm,
  inferPresetFromText,
} from './init-interactive.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { ConflictStrategy, ProjectMeta } from './init-interactive.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'
import type { GenerateMode } from '../generator/file-generator.js'
import { estimateRun, formatEstimate } from '../agents/deep-agent/preflight.js'
import { loadDeepAgentDeps } from '../agents/deep-agent/lazy-import.js'
import { inferProviderFromModel, listModelIds } from '../agents/deep-agent/config.js'

interface InitOptions {
  preset?: string
  agent?: string
  name?: string
  conflict?: string
  scan?: boolean
  dryRun?: boolean
  force?: boolean
  full?: boolean
  yes?: boolean
  llm?: boolean
  deepAgent?: boolean
  depth?: string
  model?: string
  provider?: string
  apiKey?: string
}

export const initCommand = new Command('init')
  .description('初始化 G-Harness 规范到项目中')
  .option('--preset <name>', '使用预设（nextjs | nuxt | nestjs | vite-vue | vite-react | electron | tauri | react-native | miniprogram | vanilla | base）')
  .option('--agent <names>', 'AI 助手（claude,cursor,windsurf,copilot,trae,kimi,codex,generic），逗号分隔多选，默认 claude')
  .option('--name <name>', '项目名称')
  .option('--conflict <strategy>', '冲突策略：skip（默认）、overwrite、prompt')
  .option('--scan', '扫描已有项目结构并推荐预设')
  .option('--dry-run', '仅预览将生成的文件，不实际写入')
  .option('--force', '覆盖已有配置文件（等同 --conflict overwrite）')
  .option('--full', '输出完整文档体系（默认仅输出核心层）')
  .option('--llm', '启用 LLM 内容增强（检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY 时生效；失败自动降级）')
  .option('--deep-agent', '启用 Deep Agent 自主生成（v1.4，需安装 deepagents + @langchain/*；失败自动降级）')
  .option('--depth <level>', 'Deep Agent 分析深度：shallow | medium | deep（默认 medium）')
  .option('--model <id>', 'LLM 模型 ID（如 claude-sonnet-4-5 / gpt-4o-mini），不指定则按 depth 回落（ADR-011）')
  .option('--provider <name>', 'LLM 供应商：anthropic | openai；不指定则按 --model 或 env 推断（ADR-011）')
  .option('--api-key <key>', 'LLM API Key（⚠️ 会进入 shell history，优先使用 ANTHROPIC_API_KEY / OPENAI_API_KEY 环境变量）')
  .option('-y, --yes', '跳过所有交互，使用默认值')
  .action(async (options: InitOptions) => {
    const targetDir = process.cwd()
    const harnessRoot = getHarnessRoot()
    const isInteractive = !options.yes && process.stdout.isTTY !== false

    p.intro(pc.bold('G-Harness 初始化'))

    // ── Stage 1: 项目检测 ──
    const scanner = new ProjectScanner()
    const scanResult = await scanner.scan(targetDir)
    const detection = await detectProject(targetDir, scanResult)

    let mode = 'existing' as 'new' | 'existing' | 'reinit'
    if (isInteractive) {
      const stage1 = await stage1DetectProject(detection)
      if (!stage1.shouldContinue) {
        p.outro('已取消')
        return
      }
      mode = stage1.mode
    } else {
      const { resolveProjectMode } = await import('../scanner/detect-project.js')
      mode = resolveProjectMode(detection)
    }

    // ── Stage 2: AI 助手选择 ──
    let agents: AgentDefinition[]
    if (options.agent) {
      agents = resolveAgents(options.agent)
    } else if (isInteractive) {
      const result = await stage2SelectAgents(detection.existingAgents)
      if (result.cancelled) {
        p.outro('已取消')
        return
      }
      agents = result.agents
    } else {
      agents = [getAgentOrThrow('claude')]
    }

    // ── Stage 4: 项目元信息（先于技术栈，便于技术栈输入时带入上下文） ──
    let meta: ProjectMeta
    if (isInteractive) {
      const collected = await stage4CollectMeta(detection)
      if (!collected) {
        p.outro('已取消')
        return
      }
      meta = collected
    } else {
      const dirName = targetDir.split(/[/\\]/).filter(Boolean).pop() ?? 'my-project'
      // 非交互模式：老项目自动尝试从 package.json/README 推导描述
      let autoName: string | null = null
      let autoDesc: string | null = null
      if (mode !== 'new') {
        const { autoDescribe } = await import('../analyzer/index.js')
        const auto = await autoDescribe(targetDir)
        autoName = auto.projectName
        autoDesc = auto.description
      }
      meta = {
        projectName: options.name ?? autoName ?? dirName,
        projectDescription: autoDesc ?? '',
        srcDir: scanResult.structure.srcDir ?? 'src',
        source: autoDesc ? 'auto' : 'manual',
      }
    }

    // ── Stage 3: 技术栈自由文本（B 方案，ADR-007 修订） ──
    // 交互模式：用户自由输入，内部反推预设
    // 非交互模式：--preset 优先；否则按 scanner framework 推断
    let presetName: string
    let techStackText: string | undefined
    if (options.preset) {
      presetName = options.preset
    } else if (isInteractive) {
      const stack = await stage3TechStack(detection, mode)
      if (!stack) {
        p.outro('已取消')
        return
      }
      techStackText = stack.techStack
      presetName = stack.inferredPreset
      meta.techStack = techStackText
    } else {
      // 非交互模式：用 scanner 识别 + 文本反推（若 --name/--description 未带技术栈则仅靠 scanner）
      techStackText = inferTechStackFromScan(scanResult)
      if (techStackText) meta.techStack = techStackText
      presetName = inferPresetFromText(techStackText ?? '', scanResult.techStack.framework)
    }

    const preset = await loadPreset(harnessRoot, presetName)
    if (!preset) {
      p.log.warn(pc.yellow(`未找到预设 "${presetName}"，使用 base 预设`))
      presetName = 'base'
    }

    // ── Stage 5: 输出配置 ──
    let full = options.full ?? false
    let conflictStrategy: ConflictStrategy = options.force ? 'overwrite' : 'skip'
    let installHook = true
    let useLlm = options.llm ?? false

    // v1.4 生成模式解析（CLI flag）
    let generateMode: GenerateMode = options.deepAgent
      ? 'deep-agent'
      : options.llm
        ? 'llm-enhance'
        : 'template'
    let depth: Depth | undefined = parseDepthFlag(options.depth)
    if (generateMode === 'deep-agent' && !depth) depth = 'medium'

    // ADR-011：model / provider CLI 解析（--model 先校验；provider 由 --provider 或 model 推断）
    const cliModel = parseModelFlag(options.model, options.provider)
    let selectedProvider: AgentProvider | undefined = cliModel?.provider ?? parseProviderFlag(options.provider)
    let selectedModel: string | undefined = cliModel?.model
    let selectedApiKey: string | undefined = options.apiKey
    if (selectedApiKey) {
      p.log.warn(pc.yellow('⚠️  通过 --api-key 传入密钥会进入 shell history，生产环境建议改用 ANTHROPIC_API_KEY / OPENAI_API_KEY 环境变量'))
    }

    if (options.conflict) {
      const valid: ConflictStrategy[] = ['skip', 'overwrite', 'prompt']
      if (!valid.includes(options.conflict as ConflictStrategy)) {
        p.log.error(pc.red(`无效的冲突策略: "${options.conflict}"，可选: ${valid.join(', ')}`))
        process.exit(1)
      }
      conflictStrategy = options.conflict as ConflictStrategy
    }

    if (isInteractive) {
      const outputConfig = await stage5OutputConfig(mode, { targetDir })
      if (!outputConfig) {
        p.outro('已取消')
        return
      }
      full = outputConfig.full
      conflictStrategy = outputConfig.conflict
      installHook = outputConfig.installHook
      useLlm = outputConfig.useLlm
      generateMode = outputConfig.mode
      depth = outputConfig.depth
      // CLI flag 优先；否则采用交互值（ADR-011）
      selectedProvider = selectedProvider ?? outputConfig.provider
      selectedModel = selectedModel ?? outputConfig.model
      selectedApiKey = selectedApiKey ?? outputConfig.apiKey
    } else if (generateMode === 'deep-agent') {
      // 非交互模式：验证 deep-agent 依赖与 API key；缺失则友好降级
      const deps = await loadDeepAgentDeps()
      const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY)
      if (!deps.ok) {
        p.log.warn(pc.yellow(`Deep Agent 依赖缺失：${deps.missing.join(', ')}，降级到 ${hasKey ? 'llm-enhance' : 'template'}`))
        generateMode = hasKey ? 'llm-enhance' : 'template'
        useLlm = generateMode === 'llm-enhance'
        depth = undefined
      } else if (!hasKey) {
        p.log.warn(pc.yellow('未检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY，降级到 template'))
        generateMode = 'template'
        useLlm = false
        depth = undefined
      }
    }

    // ── Stage 6: 确认预览 & 执行 ──
    const effectivePreset = (await loadPreset(harnessRoot, presetName)) ?? null
    const generator = new FileGenerator()

    // dry-run 收集文件列表用于预览（deep-agent 模式下预览阶段不跑 agent，只列模板文件）
    const previewResult = await generator.generate({
      harnessRoot,
      preset: effectivePreset,
      targetDir,
      scanResult,
      overwrite: conflictStrategy === 'overwrite',
      dryRun: true,
      full,
      agents,
      meta,
    })

    // Stage 6 预估（仅 deep-agent 模式需要）
    let estimateLine: string | undefined
    if (generateMode === 'deep-agent' && depth) {
      try {
        const estimate = await estimateRun({ targetDir, depth })
        const provider = selectedProvider ?? (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'openai')
        estimateLine = formatEstimate(estimate, provider)
      } catch {
        // preflight 失败不阻塞
      }
    }

    if (isInteractive) {
      const filesToCreate = [...previewResult.created, ...previewResult.overwritten]
      const confirmed = await stage6Confirm({
        agents,
        presetName,
        full,
        conflict: conflictStrategy,
        installHook,
        useLlm,
        mode: generateMode,
        depth,
        estimateLine,
        meta,
        filesToCreate,
      })
      if (!confirmed) {
        p.outro('已取消')
        return
      }
    }

    // 实际执行
    const onConflict = conflictStrategy === 'prompt'
      ? async (filePath: string) => {
          const answer = await p.confirm({ message: `覆盖 ${filePath}？`, initialValue: false })
          return !p.isCancel(answer) && (answer as boolean)
        }
      : undefined

    const result = await generator.generate({
      harnessRoot,
      preset: effectivePreset,
      targetDir,
      scanResult,
      overwrite: conflictStrategy === 'overwrite',
      dryRun: options.dryRun ?? false,
      full,
      agents,
      meta,
      onConflict,
      useLlm,
      mode: generateMode,
      depth,
      provider: selectedProvider,
      model: selectedModel,
      apiKey: selectedApiKey,
      onLlmResult: (info) => {
        if (info.enhanced) {
          p.log.success(pc.green(`LLM 增强已应用（provider: ${info.provider}）`))
        } else if (info.reason === 'no-key') {
          p.log.warn(pc.yellow('未检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY，降级到规则版'))
        } else {
          p.log.warn(pc.yellow(`LLM 增强失败（${info.reason ?? 'unknown'}），降级到规则版`))
        }
      },
      onDeepAgentResult: (info) => {
        if (info.status === 'success') {
          const cost = info.costUsd !== null ? ` / $${info.costUsd.toFixed(4)}` : ''
          p.log.success(pc.green(`Deep Agent 产出 ${info.draftCount} 份白名单草稿${cost}`))
          if (info.tracePath) {
            console.log(pc.dim(`  trace: ${info.tracePath}`))
          }
        } else {
          p.log.warn(
            pc.yellow(`Deep Agent 降级（${info.reason ?? 'unknown'}）：${info.message ?? ''}；已回落到模板路径`),
          )
        }
      },
    })

    // 输出结果
    if (options.dryRun) {
      p.log.warn(pc.yellow('预览模式，未写入任何文件'))
    }

    if (result.created.length > 0) {
      p.log.success(pc.green(`创建 ${result.created.length} 个文件`))
      for (const f of result.created) {
        console.log(pc.green(`  + ${f}`))
      }
    }

    if (result.skipped.length > 0) {
      console.log(pc.dim(`\n跳过 ${result.skipped.length} 个已存在的文件`))
    }

    if (result.overwritten.length > 0) {
      console.log(pc.yellow(`\n覆盖 ${result.overwritten.length} 个文件`))
      for (const f of result.overwritten) {
        console.log(pc.yellow(`  ~ ${f}`))
      }
    }

    // 安装 git pre-commit hook
    if (installHook) {
      const hookResult = await installPreCommitHook(harnessRoot, targetDir, {
        overwrite: conflictStrategy === 'overwrite',
        dryRun: options.dryRun ?? false,
      })
      if (hookResult.installed) {
        p.log.success(pc.green('安装 pre-commit hook'))
      } else if (hookResult.skipped && hookResult.reason) {
        console.log(pc.dim(hookResult.reason))
      }
    }

    p.outro(pc.bold(pc.green('初始化完成!')))

    if (!full) {
      console.log(pc.dim('提示: 使用 --full 输出完整文档体系'))
    }
  })

function resolveAgents(agentArg: string): AgentDefinition[] {
  const ids = agentArg.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) return [getAgentOrThrow('claude')]

  const validIds = listAgentIds()
  const agents: AgentDefinition[] = []
  for (const id of ids) {
    const agent = getAgent(id)
    if (!agent) {
      console.log(pc.red(`错误: 未知的 AI 助手 "${id}"`))
      console.log(pc.dim(`支持的选项: ${validIds.join(', ')}`))
      process.exit(1)
    }
    agents.push(agent)
  }
  return agents
}

function parseDepthFlag(flag: string | undefined): Depth | undefined {
  if (!flag) return undefined
  const valid: Depth[] = ['shallow', 'medium', 'deep']
  if (valid.includes(flag as Depth)) return flag as Depth
  console.log(pc.red(`错误: 无效的 --depth 值 "${flag}"，可选: ${valid.join(', ')}`))
  process.exit(1)
}

/** 解析 --provider flag（ADR-011） */
function parseProviderFlag(flag: string | undefined): AgentProvider | undefined {
  if (!flag) return undefined
  const valid: AgentProvider[] = ['anthropic', 'openai']
  if (valid.includes(flag as AgentProvider)) return flag as AgentProvider
  console.log(pc.red(`错误: 无效的 --provider 值 "${flag}"，可选: ${valid.join(', ')}`))
  process.exit(1)
}

/**
 * 解析 --model flag（ADR-011）。
 * - 校验模型 ID 必须在 MODEL_PRICING 表内
 * - 同时给了 --provider 时二者必须一致
 * - 只给 --model 时从 ID 反查 provider
 */
function parseModelFlag(
  modelFlag: string | undefined,
  providerFlag: string | undefined,
): { provider: AgentProvider; model: string } | null {
  if (!modelFlag) return null
  const legal = listModelIds()
  if (!legal.includes(modelFlag)) {
    console.log(pc.red(`错误: 无效的 --model 值 "${modelFlag}"`))
    console.log(pc.dim(`合法取值: ${legal.join(', ')}`))
    process.exit(1)
  }
  const inferred = inferProviderFromModel(modelFlag)
  if (!inferred) {
    // listModelIds 已覆盖所有已知模型，不应到达
    console.log(pc.red(`错误: 模型 "${modelFlag}" 无法推断 provider`))
    process.exit(1)
  }
  const explicitProvider = parseProviderFlag(providerFlag)
  if (explicitProvider && explicitProvider !== inferred) {
    console.log(pc.red(`错误: --model "${modelFlag}" 属于 ${inferred}，与 --provider "${explicitProvider}" 冲突`))
    process.exit(1)
  }
  return { provider: inferred, model: modelFlag }
}

/** 非交互模式下从 scanner 结果合成一行技术栈文本（供 meta.techStack / Deep Agent 上下文使用） */
function inferTechStackFromScan(scan: import('../scanner/project-scanner.js').ScanResult): string {
  const t = scan.techStack
  const parts: string[] = []
  if (t.framework) parts.push(t.framework)
  if (t.language) parts.push(t.language)
  if (t.buildTool) parts.push(t.buildTool)
  if (t.testRunner) parts.push(t.testRunner)
  if (t.packageManager) parts.push(t.packageManager)
  return parts.filter((v, i, a) => a.indexOf(v) === i).join(', ')
}

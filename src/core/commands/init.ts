import { Command } from 'commander'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { ProjectScanner } from '../scanner/project-scanner.js'
import { detectProject } from '../scanner/detect-project.js'
import { FileGenerator } from '../generator/file-generator.js'
import { installPreCommitHook } from '../generator/hook-installer.js'
import { loadPreset } from '../preset-loader.js'
import { getGForgeRoot } from '../paths.js'
import { getAgent, getAgentOrThrow, listAgentIds } from '../agents/agent-registry.js'
import {
  stage1DetectProject,
  stage2SelectAgents,
  stage3SelectPreset,
  stage4CollectMeta,
  stage5OutputConfig,
  stage6Confirm,
} from './init-interactive.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { ConflictStrategy, ProjectMeta } from './init-interactive.js'

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
}

export const initCommand = new Command('init')
  .description('初始化 G-Forge 规范到项目中')
  .option('--preset <name>', '使用预设（nextjs | nuxt | nestjs | vite-vue | vite-react | electron | tauri | react-native | miniprogram | vanilla | base）')
  .option('--agent <names>', 'AI 助手（claude,cursor,windsurf,copilot,trae,kimi,codex,generic），逗号分隔多选，默认 claude')
  .option('--name <name>', '项目名称')
  .option('--conflict <strategy>', '冲突策略：skip（默认）、overwrite、prompt')
  .option('--scan', '扫描已有项目结构并推荐预设')
  .option('--dry-run', '仅预览将生成的文件，不实际写入')
  .option('--force', '覆盖已有配置文件（等同 --conflict overwrite）')
  .option('--full', '输出完整文档体系（默认仅输出核心层）')
  .option('--llm', '启用 LLM 内容增强（检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY 时生效；失败自动降级）')
  .option('-y, --yes', '跳过所有交互，使用默认值')
  .action(async (options: InitOptions) => {
    const targetDir = process.cwd()
    const gforgeRoot = getGForgeRoot()
    const isInteractive = !options.yes && process.stdout.isTTY !== false

    p.intro(pc.bold('G-Forge 初始化'))

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

    // ── Stage 3: 技术栈 & 预设 ──
    let presetName: string
    if (options.preset) {
      presetName = options.preset
    } else if (isInteractive) {
      const selected = await stage3SelectPreset(detection, mode)
      if (!selected) {
        p.outro('已取消')
        return
      }
      presetName = selected
    } else {
      presetName = detectPreset(scanResult.techStack.framework)
    }

    const preset = await loadPreset(gforgeRoot, presetName)
    if (!preset) {
      p.log.warn(pc.yellow(`未找到预设 "${presetName}"，使用 base 预设`))
      presetName = 'base'
    }

    // ── Stage 4: 项目元信息 ──
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

    // ── Stage 5: 输出配置 ──
    let full = options.full ?? false
    let conflictStrategy: ConflictStrategy = options.force ? 'overwrite' : 'skip'
    let installHook = true

    if (options.conflict) {
      const valid: ConflictStrategy[] = ['skip', 'overwrite', 'prompt']
      if (!valid.includes(options.conflict as ConflictStrategy)) {
        p.log.error(pc.red(`无效的冲突策略: "${options.conflict}"，可选: ${valid.join(', ')}`))
        process.exit(1)
      }
      conflictStrategy = options.conflict as ConflictStrategy
    }

    if (isInteractive) {
      const outputConfig = await stage5OutputConfig(mode)
      if (!outputConfig) {
        p.outro('已取消')
        return
      }
      full = outputConfig.full
      conflictStrategy = outputConfig.conflict
      installHook = outputConfig.installHook
    }

    // ── Stage 6: 确认预览 & 执行 ──
    const effectivePreset = (await loadPreset(gforgeRoot, presetName)) ?? null
    const generator = new FileGenerator()

    // dry-run 收集文件列表用于预览
    const previewResult = await generator.generate({
      gforgeRoot,
      preset: effectivePreset,
      targetDir,
      scanResult,
      overwrite: conflictStrategy === 'overwrite',
      dryRun: true,
      full,
      agents,
      meta,
    })

    if (isInteractive) {
      const filesToCreate = [...previewResult.created, ...previewResult.overwritten]
      const confirmed = await stage6Confirm({
        agents,
        presetName,
        full,
        conflict: conflictStrategy,
        installHook,
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
      gforgeRoot,
      preset: effectivePreset,
      targetDir,
      scanResult,
      overwrite: conflictStrategy === 'overwrite',
      dryRun: options.dryRun ?? false,
      full,
      agents,
      meta,
      onConflict,
      useLlm: options.llm ?? false,
      onLlmResult: (info) => {
        if (info.enhanced) {
          p.log.success(pc.green(`LLM 增强已应用（provider: ${info.provider}）`))
        } else if (info.reason === 'no-key') {
          p.log.warn(pc.yellow('未检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY，降级到规则版'))
        } else {
          p.log.warn(pc.yellow(`LLM 增强失败（${info.reason ?? 'unknown'}），降级到规则版`))
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
      const hookResult = await installPreCommitHook(gforgeRoot, targetDir, {
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

function detectPreset(framework: string | null): string {
  if (!framework) return 'vanilla'
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
  }
  return map[framework.toLowerCase()] ?? 'vanilla'
}

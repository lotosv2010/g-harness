import { Command } from 'commander'
import pc from 'picocolors'
import { ProjectScanner } from '../scanner/project-scanner.js'
import { FileGenerator } from '../generator/file-generator.js'
import { installPreCommitHook } from '../generator/hook-installer.js'
import { loadPreset } from '../preset-loader.js'
import { getGForgeRoot } from '../paths.js'
import { getAgent, listAgentIds } from '../agents/agent-registry.js'
import { selectAgents, printAgentSummary } from './init-interactive.js'
import type { AgentDefinition } from '../agents/agent-registry.js'

interface InitOptions {
  preset?: string
  agent?: string
  scan?: boolean
  dryRun?: boolean
  force?: boolean
  full?: boolean
}

export const initCommand = new Command('init')
  .description('初始化 G-Forge 规范到项目中')
  .option('--preset <name>', '使用预设（nextjs | nuxt | nestjs | vite-vue | vite-react | electron | tauri | react-native | miniprogram | vanilla | base）')
  .option('--agent <names>', 'AI 助手（claude,cursor,windsurf,copilot,trae,kimi,codex,generic），逗号分隔多选，默认 claude')
  .option('--scan', '扫描已有项目结构并推荐预设')
  .option('--dry-run', '仅预览将生成的文件，不实际写入')
  .option('--force', '覆盖已有配置文件')
  .option('--full', '输出完整文档体系（默认仅输出核心层）')
  .action(async (options: InitOptions) => {
    const targetDir = process.cwd()
    const gforgeRoot = getGForgeRoot()

    console.log(pc.bold('\n🔧 G-Forge 初始化\n'))

    // 解析 agent：有 --agent 参数走非交互，否则交互选择
    let agents: AgentDefinition[]
    if (options.agent) {
      agents = resolveAgents(options.agent)
    } else {
      const result = await selectAgents()
      if (result.cancelled) return
      agents = result.agents
    }
    printAgentSummary(agents)

    const scanner = new ProjectScanner()
    const scanResult = await scanner.scan(targetDir)

    console.log(pc.dim('项目扫描完成:'))
    console.log(pc.dim(`  语言: ${scanResult.techStack.language ?? '未检测到'}`))
    console.log(pc.dim(`  框架: ${scanResult.techStack.framework ?? '未检测到'}`))
    console.log(pc.dim(`  包管理: ${scanResult.techStack.packageManager ?? '未检测到'}`))
    console.log()

    const presetName = options.preset ?? detectPreset(scanResult.techStack.framework)
    const preset = await loadPreset(gforgeRoot, presetName)

    if (!preset) {
      console.log(pc.yellow(`未找到预设 "${presetName}"，使用 vanilla 预设`))
    }

    console.log(pc.cyan(`使用预设: ${preset?.name ?? 'vanilla'}`))
    console.log()

    const generator = new FileGenerator()
    const result = await generator.generate({
      gforgeRoot,
      preset: preset ?? null,
      targetDir,
      scanResult,
      overwrite: options.force ?? false,
      dryRun: options.dryRun ?? false,
      full: options.full ?? false,
      agents,
    })

    if (options.dryRun) {
      console.log(pc.yellow('预览模式，未写入任何文件:\n'))
    }

    if (result.created.length > 0) {
      console.log(pc.green(`创建 ${result.created.length} 个文件:`))
      for (const f of result.created) {
        console.log(pc.green(`  + ${f}`))
      }
    }

    if (result.skipped.length > 0) {
      console.log(pc.dim(`\n跳过 ${result.skipped.length} 个已存在的文件:`))
      for (const f of result.skipped) {
        console.log(pc.dim(`  - ${f}`))
      }
    }

    if (result.overwritten.length > 0) {
      console.log(pc.yellow(`\n覆盖 ${result.overwritten.length} 个文件:`))
      for (const f of result.overwritten) {
        console.log(pc.yellow(`  ~ ${f}`))
      }
    }

    // 安装 git pre-commit hook
    const hookResult = await installPreCommitHook(gforgeRoot, targetDir, {
      overwrite: options.force ?? false,
      dryRun: options.dryRun ?? false,
    })
    if (hookResult.installed) {
      console.log(pc.green('\n安装 pre-commit hook（提交前自动校验）'))
    } else if (hookResult.skipped && hookResult.reason) {
      console.log(pc.dim(`\n${hookResult.reason}`))
    }

    console.log(pc.bold(pc.green('\n✓ 初始化完成!')))

    if (!options.full) {
      console.log(pc.dim('提示: 使用 --full 输出完整文档体系（护栏、技能、Prompt、扩展文档等）'))
    }
    console.log()
  })

function resolveAgents(agentArg?: string): AgentDefinition[] {
  if (!agentArg) return [getAgent('claude')!]
  const ids = agentArg.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) return [getAgent('claude')!]

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

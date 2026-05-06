// init 命令入口：薄派发 —— 解析 flag → 路由 Wizard → FileGenerator。

import { Command } from 'commander'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { FileGenerator } from '../generator/file-generator.js'
import { buildWizardContext, routeProjectMode, previewAndConfirm } from './init-shared.js'
import { runNewProjectWizard } from './init-new.js'
import { runExistingProjectWizard } from './init-existing.js'
import type {
  InitCliOptions,
  GenerateMode,
  ConflictStrategy,
} from './init-types.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'

function resolveHarnessRoot(): string {
  const here = fileURLToPath(import.meta.url)
  // dirname(dist/core/commands/init.js) = dist/core/commands → up 3 reaches repo root
  return resolve(dirname(here), '..', '..', '..')
}

interface RawCliFlags {
  preset?: string
  agent?: string
  name?: string
  conflict?: string
  scan?: boolean
  dryRun?: boolean
  force?: boolean
  full?: boolean
  yes?: boolean
  mode?: string
  depth?: string
  llm?: boolean
  deepAgent?: boolean
  model?: string
  provider?: string
  apiKey?: string
  baseUrl?: string
}

function normalizeMode(raw: RawCliFlags): GenerateMode | undefined {
  if (raw.mode) return raw.mode as GenerateMode
  if (raw.deepAgent) {
    console.warn(pc.yellow('⚠ --deep-agent 已弃用，请使用 --mode deep-agent'))
    return 'deep-agent'
  }
  if (raw.llm) {
    console.warn(pc.yellow('⚠ --llm 已弃用，请使用 --mode llm-enhance'))
    return 'llm-enhance'
  }
  return undefined
}

function normalizeCli(raw: RawCliFlags, targetDir: string): InitCliOptions {
  return {
    preset: raw.preset,
    agents: raw.agent ? raw.agent.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    name: raw.name,
    conflict: raw.conflict as ConflictStrategy | undefined,
    scan: raw.scan !== false,
    dryRun: raw.dryRun === true,
    force: raw.force === true,
    full: raw.full === true,
    yes: raw.yes === true,
    mode: normalizeMode(raw),
    depth: raw.depth as Depth | undefined,
    model: raw.model,
    provider: raw.provider as AgentProvider | undefined,
    apiKey: raw.apiKey,
    baseUrl: raw.baseUrl,
    targetDir,
  }
}

async function runInit(rawFlags: RawCliFlags, targetDirArg?: string): Promise<void> {
  const targetDir = resolve(targetDirArg ?? process.cwd())
  const cli = normalizeCli(rawFlags, targetDir)
  const harnessRoot = resolveHarnessRoot()

  p.intro(pc.bgCyan(pc.black(' g-harness init ')))

  const ctx = await buildWizardContext(cli, harnessRoot)
  const mode = await routeProjectMode(ctx)
  if (!mode) {
    p.cancel('已取消')
    return
  }

  const result = mode === 'new'
    ? await runNewProjectWizard(ctx)
    : await runExistingProjectWizard(ctx, mode === 'reinit')
  if (!result) {
    p.cancel('已取消')
    return
  }

  const confirmed = await previewAndConfirm(result, ctx)
  if (!confirmed) {
    p.cancel('已取消')
    return
  }

  // 非交互 + deep-agent 且无 API key → 直接失败（ollama 无需 key）
  if (result.mode === 'deep-agent' && !result.apiKey) {
    const { PROVIDER_REGISTRY, readProviderEnv } = await import('../agents/deep-agent/config.js')
    const prov = result.provider ?? 'anthropic'
    const cfg = PROVIDER_REGISTRY[prov]
    if (cfg.requiresApiKey) {
      const envKey = readProviderEnv(prov, process.env).apiKey
      if (!envKey) {
        p.cancel(pc.red(`缺少 ${cfg.apiKeyEnvVars.join(' / ')}（${cfg.label}）；Deep Agent 无法运行`))
        return
      }
    }
  }

  const generator = new FileGenerator()
  const spinner = p.spinner()
  spinner.start('生成中…')
  // Deep Agent 流式日志缓冲：spinner 信息只显示最近一行，完整轨迹 outro 前打印
  const agentLog: string[] = []
  const isDeepAgent = result.mode === 'deep-agent'

  try {
    const gen = await generator.generate({
      targetDir: ctx.targetDir,
      harnessRoot,
      agents: result.agents,
      preset: result.preset,
      meta: result.meta,
      scanResult: ctx.scanResult,
      mode: result.mode,
      conflict: result.conflict,
      templateSelection: result.templateSelection,
      dryRun: cli.dryRun,
      depth: result.depth,
      provider: result.provider,
      model: result.model,
      apiKey: result.apiKey,
      baseUrl: result.baseUrl,
      onMessage: (msg) => {
        if (msg.startsWith('[deep-agent] ')) {
          agentLog.push(msg.slice('[deep-agent] '.length))
        }
        // spinner 始终只展示最新一行
        spinner.message(msg)
      },
    })
    spinner.stop(`完成（策略：${gen.usedStrategy}${gen.degradedFrom ? ` ← 降级自 ${gen.degradedFrom}` : ''}）`)

    // Deep Agent 路径下：把完整轨迹以 note 形式回放给用户
    if (isDeepAgent && agentLog.length > 0) {
      const shown = agentLog.slice(-40) // 保护终端：最多展示最后 40 行
      const trimmedHint = agentLog.length > shown.length ? `… 已省略前 ${agentLog.length - shown.length} 条\n` : ''
      p.note(trimmedHint + shown.join('\n'), 'Deep Agent 执行轨迹')
    }

    if (gen.degradeReason) {
      p.log.warn(pc.yellow(`降级原因：${gen.degradeReason}`))
    }
    if (cli.dryRun) {
      p.note(gen.drafts.map((d) => `· ${d.outputPath}`).join('\n'), 'Dry run — 将生成')
    } else {
      const lines = gen.written.map((w) => `${actionIcon(w.action)} ${w.path}`)
      p.note(lines.join('\n') || '（未产出任何文件）', `已写入 ${gen.written.length} 文件`)
    }
    p.outro(pc.green('g-harness init 完成'))
  } catch (err) {
    spinner.stop('失败')
    p.log.error((err as Error).message)
    process.exitCode = 1
  }
  // LangChain/LangGraph 可能持有 HTTP keep-alive socket 或事件监听，导致 Node event loop 无法退出。
  // 主流程完成后给 stdout flush 一点时间，然后显式 exit，避免 CLI 挂起。
  await new Promise((r) => setTimeout(r, 50))
  process.exit(process.exitCode ?? 0)
}

function actionIcon(action: 'created' | 'overwritten' | 'skipped'): string {
  switch (action) {
    case 'created':
      return pc.green('+')
    case 'overwritten':
      return pc.yellow('~')
    case 'skipped':
      return pc.dim('·')
  }
}

export const initCommand = new Command('init')
  .description('初始化 / 反演 g-harness 规范文档')
  .argument('[dir]', '目标目录，默认 cwd')
  .option('--preset <name>', '技术栈预设 name')
  .option('--agent <ids>', '逗号分隔的 agent id（如 claude,cursor）')
  .option('--name <name>', '项目名')
  .option('--conflict <strategy>', 'skip | overwrite | prompt')
  .option('--no-scan', '跳过项目扫描')
  .option('--dry-run', '只预览，不写盘')
  .option('--force', '覆盖已存在文件')
  .option('--full', '生成完整模板集（含可选文件）')
  .option('--yes, -y', '非交互模式')
  .option('--mode <mode>', 'template | llm-enhance | deep-agent')
  .option('--depth <depth>', 'shallow | medium | deep（仅 deep-agent）')
  .option('--llm', '[弃用] 等价 --mode llm-enhance')
  .option('--deep-agent', '[弃用] 等价 --mode deep-agent')
  .option('--model <id>', 'LLM 模型 id')
  .option('--provider <name>', 'anthropic | openai | deepseek | minimax | gemini | moonshot | ollama')
  .option('--api-key <key>', 'API Key（慎用 —— 可能落 shell history）')
  .option('--base-url <url>', '自定义 base URL（兼容 minimax/moonshot/deepseek/ollama）')
  .action(async (dir: string | undefined, opts: RawCliFlags) => {
    await runInit(opts, dir)
  })

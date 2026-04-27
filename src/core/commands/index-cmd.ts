// g-harness index — 扫描项目生成 PROJECT_MAP / FEATURES / ROUTES 三个 Markdown 索引

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import { join, dirname } from 'node:path'
import { Command } from 'commander'
import pc from 'picocolors'
import { ProjectScanner } from '../scanner/project-scanner.js'
import {
  buildProjectIndex,
  detectIndexDrift,
  renderFeatures,
  renderProjectMap,
  renderRoutes,
} from '../indexer/index.js'
import { fileExists } from '../fs-utils.js'

interface IndexCliOptions {
  output?: string
  dryRun?: boolean
  json?: boolean
  check?: boolean
  watch?: boolean
}

interface IndexWriteResult {
  wrote: string[]
  unchanged: string[]
  durationMs: number
}

async function buildAndWrite(
  rootDir: string,
  outputDir: string,
  dryRun: boolean,
): Promise<IndexWriteResult> {
  const started = Date.now()
  const scanner = new ProjectScanner()
  const scan = await scanner.scan(rootDir)
  const index = await buildProjectIndex(rootDir, scan)

  const files: Array<[string, string]> = [
    ['PROJECT_MAP.md', renderProjectMap(index)],
    ['FEATURES.md', renderFeatures(index)],
    ['ROUTES.md', renderRoutes(index)],
  ]

  if (dryRun) {
    return { wrote: [], unchanged: files.map(([n]) => n), durationMs: Date.now() - started }
  }

  await mkdir(outputDir, { recursive: true })
  const wrote: string[] = []
  const unchanged: string[] = []

  for (const [name, content] of files) {
    const target = join(outputDir, name)
    await mkdir(dirname(target), { recursive: true })
    // 内容无变化时不写入，避免触发下游 watcher
    if (await fileExists(target)) {
      const prev = await readFile(target, 'utf-8')
      if (prev === content) {
        unchanged.push(name)
        continue
      }
    }
    await writeFile(target, content, 'utf-8')
    wrote.push(name)
  }

  return { wrote, unchanged, durationMs: Date.now() - started }
}

export const indexCommand = new Command('index')
  .description('扫描项目并生成 PROJECT_MAP/FEATURES/ROUTES 索引（AI 优先读取入口）')
  .option('--output <dir>', '索引输出目录（默认 docs/）', 'docs')
  .option('--dry-run', '仅打印摘要，不写入文件')
  .option('--json', '以 JSON 形式输出原始索引数据')
  .option('--check', '仅检测索引与代码的漂移，不修改文件；发现漂移时退出码 1')
  .option('--watch', '监听 src/ 变化，自动增量刷新索引（Ctrl+C 退出）')
  .action(async (options: IndexCliOptions) => {
    const rootDir = process.cwd()
    const outputDir = join(rootDir, options.output ?? 'docs')

    if (!options.watch) {
      console.log(pc.bold('\n🔎 G-Harness 项目索引生成\n'))
    }

    // --json：一次性输出
    if (options.json) {
      const scanner = new ProjectScanner()
      const scan = await scanner.scan(rootDir)
      const index = await buildProjectIndex(rootDir, scan)
      console.log(JSON.stringify(index, null, 2))
      return
    }

    // --check：漂移检测
    if (options.check) {
      const scanner = new ProjectScanner()
      const scan = await scanner.scan(rootDir)
      const index = await buildProjectIndex(rootDir, scan)

      const report = await detectIndexDrift(rootDir, outputDir, index)
      if (!report.hasIndex) {
        console.log(pc.yellow('未检测到现有索引文件（PROJECT_MAP / FEATURES / ROUTES）'))
        console.log(pc.dim('请先运行 `g-harness index` 生成索引，再使用 --check 做漂移检测'))
        process.exit(1)
      }
      const { added, removed, dangling } = report.totals
      console.log(pc.dim(`漂移统计：`))
      console.log(pc.dim(`  新增未同步：${added}`))
      console.log(pc.dim(`  残留已删除：${removed}`))
      console.log(pc.dim(`  引用已失效：${dangling}\n`))

      if (report.items.length === 0) {
        console.log(pc.bold(pc.green('✓ 索引与代码一致，无漂移\n')))
        return
      }

      for (const item of report.items) {
        const color =
          item.type === 'added' ? pc.green : item.type === 'removed' ? pc.red : pc.yellow
        const sign = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : '!'
        console.log(color(`  ${sign} [${item.kind}] ${item.description}`))
      }
      console.log()
      console.log(pc.yellow('建议运行 `g-harness index` 重新生成索引\n'))
      process.exit(1)
    }

    // --watch：长驻监听
    if (options.watch) {
      await runWatchMode(rootDir, outputDir, options.output ?? 'docs')
      return
    }

    // 默认：一次性生成
    const result = await buildAndWrite(rootDir, outputDir, options.dryRun ?? false)

    console.log(pc.dim(`扫描用时 ${result.durationMs}ms\n`))

    if (options.dryRun) {
      console.log(pc.yellow('预览模式，未写入任何文件'))
      return
    }

    for (const name of result.wrote) {
      console.log(pc.green(`  + ${join(options.output ?? 'docs', name)}`))
    }
    for (const name of result.unchanged) {
      console.log(pc.dim(`  = ${join(options.output ?? 'docs', name)}（无变化）`))
    }

    console.log(pc.bold(pc.green('\n✓ 索引生成完成，建议将这三个文件纳入版本管理\n')))
  })

async function runWatchMode(rootDir: string, outputDir: string, outputRel: string): Promise<void> {
  const srcDir = join(rootDir, 'src')
  if (!(await fileExists(srcDir))) {
    console.log(pc.red('未找到 src/ 目录，无法启动 --watch'))
    process.exit(1)
  }

  console.log(pc.bold(pc.cyan('\n👁  G-Harness 索引监听模式\n')))
  console.log(pc.dim(`监听目录：${srcDir}`))
  console.log(pc.dim(`输出目录：${outputDir}`))
  console.log(pc.dim('按 Ctrl+C 退出\n'))

  // 首次全量生成
  await runRebuild(rootDir, outputDir, outputRel)

  let rebuildTimer: NodeJS.Timeout | null = null
  let rebuilding = false
  const DEBOUNCE_MS = 500

  const schedule = (): void => {
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(async () => {
      if (rebuilding) {
        // 正在执行则延后
        schedule()
        return
      }
      rebuilding = true
      try {
        await runRebuild(rootDir, outputDir, outputRel)
      } finally {
        rebuilding = false
      }
    }, DEBOUNCE_MS)
  }

  const watcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return
    // 过滤索引输出目录自己触发的事件
    if (filename.includes('PROJECT_MAP.md') || filename.includes('FEATURES.md') || filename.includes('ROUTES.md')) {
      return
    }
    schedule()
  })

  process.on('SIGINT', () => {
    console.log(pc.dim('\n\n停止监听'))
    watcher.close()
    process.exit(0)
  })
}

async function runRebuild(rootDir: string, outputDir: string, outputRel: string): Promise<void> {
  try {
    const result = await buildAndWrite(rootDir, outputDir, false)
    const ts = new Date().toLocaleTimeString()
    if (result.wrote.length === 0) {
      console.log(pc.dim(`[${ts}] 扫描完成，${result.durationMs}ms，索引无变化`))
      return
    }
    console.log(pc.green(`[${ts}] 刷新索引（${result.durationMs}ms）：`))
    for (const name of result.wrote) {
      console.log(pc.green(`  ~ ${join(outputRel, name)}`))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(pc.red(`扫描失败：${msg}`))
  }
}

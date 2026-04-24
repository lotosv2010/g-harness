import { Command } from 'commander'
import pc from 'picocolors'
import { ProjectScanner } from '../scanner/project-scanner.js'
import { FileGenerator } from '../generator/file-generator.js'
import { installPreCommitHook } from '../generator/hook-installer.js'
import { loadPreset } from '../preset-loader.js'
import { getGForgeRoot } from '../paths.js'

interface InitOptions {
  preset?: string
  scan?: boolean
  dryRun?: boolean
  force?: boolean
  full?: boolean
}

export const initCommand = new Command('init')
  .description('初始化 G-Forge 规范到项目中')
  .option('--preset <name>', '使用预设（react-vite | vue-nuxt | node-api）')
  .option('--scan', '扫描已有项目结构并推荐预设')
  .option('--dry-run', '仅预览将生成的文件，不实际写入')
  .option('--force', '覆盖已有配置文件')
  .option('--full', '输出完整文档体系（默认仅输出核心层）')
  .action(async (options: InitOptions) => {
    const targetDir = process.cwd()
    const gforgeRoot = getGForgeRoot()

    console.log(pc.bold('\n🔧 G-Forge 初始化\n'))

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
      console.log(pc.yellow(`未找到预设 "${presetName}"，使用 base 预设`))
    }

    console.log(pc.cyan(`使用预设: ${preset?.name ?? 'base'}`))
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

function detectPreset(framework: string | null): string {
  if (!framework) return 'base'
  const map: Record<string, string> = {
    react: 'react-vite',
    vue: 'vue-nuxt',
    next: 'next',
    nuxt: 'vue-nuxt',
  }
  return map[framework.toLowerCase()] ?? 'base'
}

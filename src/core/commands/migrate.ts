import { Command } from 'commander'
import pc from 'picocolors'
import { ConfigMigrator } from '../migrator/config-migrator.js'
import { detectVersion, getCurrentVersion } from '../migrator/version-detector.js'
import { getHarnessRoot } from '../paths.js'
import type { MigrateResult } from '../migrator/config-migrator.js'

interface CliMigrateOptions {
  from?: string
  to?: string
  dryRun?: boolean
}

export const migrateCommand = new Command('migrate')
  .description('规范版本升级时迁移配置文件')
  .option('--from <version>', '源版本（省略则自动检测）')
  .option('--to <version>', '目标版本（默认使用当前 G-Harness 版本）')
  .option('--dry-run', '仅预览迁移方案，不实际写入')
  .action(async (options: CliMigrateOptions) => {
    const targetDir = process.cwd()
    const harnessRoot = getHarnessRoot()

    console.log(pc.bold('\n⬆ G-Harness 配置迁移\n'))

    // 检测版本
    const fromVersion = options.from ?? await detectVersion(targetDir)
    const toVersion = options.to ?? getCurrentVersion()

    console.log(pc.dim(`源版本: ${fromVersion}`))
    console.log(pc.dim(`目标版本: ${toVersion}`))
    console.log()

    if (fromVersion === toVersion) {
      console.log(pc.green('当前版本已是最新，无需迁移。\n'))
      return
    }

    // 执行迁移
    const migrator = new ConfigMigrator()
    const result = await migrator.migrate({
      targetDir,
      harnessRoot,
      fromVersion,
      toVersion,
      dryRun: options.dryRun ?? false,
    })

    // 输出结果
    printResult(result, options.dryRun ?? false)

    // 有需手动审查的文件时退出码为 1
    if (result.manualRequired.length > 0) {
      process.exitCode = 1
    }
  })

/** 打印迁移结果报告 */
function printResult(result: MigrateResult, dryRun: boolean): void {
  if (dryRun) {
    console.log(pc.yellow('预览模式，未写入任何文件:\n'))
  }

  const total = result.migrated.length + result.skipped.length + result.manualRequired.length

  if (total === 0) {
    console.log(pc.dim('未检测到 G-Harness 管理的文件。\n'))
    console.log(pc.dim('提示: 请先运行 `g-harness init` 初始化项目。\n'))
    return
  }

  // 已迁移文件
  if (result.migrated.length > 0) {
    console.log(pc.green(`已${dryRun ? '可' : ''}迁移 ${result.migrated.length} 个文件:`))
    for (const f of result.migrated) {
      console.log(pc.green(`  ✓ ${f}`))
    }
    console.log()
  }

  // 跳过文件
  if (result.skipped.length > 0) {
    console.log(pc.dim(`跳过 ${result.skipped.length} 个文件（无需变更）:`))
    for (const f of result.skipped) {
      console.log(pc.dim(`  - ${f}`))
    }
    console.log()
  }

  // 需手动审查文件
  if (result.manualRequired.length > 0) {
    console.log(
      pc.yellow(`需手动审查 ${result.manualRequired.length} 个文件（用户自定义程度较高）:`),
    )
    for (const f of result.manualRequired) {
      console.log(pc.yellow(`  ⚠ ${f}`))
    }
    console.log()
    console.log(
      pc.dim('提示: 以上文件用户自定义内容较多，建议手动对比新版本模板进行更新。'),
    )
    console.log()
  }

  // 汇总
  console.log(
    pc.dim(
      `总计: ${result.migrated.length} 迁移, ${result.skipped.length} 跳过, ${result.manualRequired.length} 待审查`,
    ),
  )

  if (!dryRun && result.migrated.length > 0) {
    console.log(pc.bold(pc.green('\n✓ 迁移完成!')))
  }

  console.log()
}

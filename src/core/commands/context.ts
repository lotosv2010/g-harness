import { Command } from 'commander'
import pc from 'picocolors'
import { ContextAnalyzer } from '../context/context-analyzer.js'

export const contextCommand = new Command('context')
  .description('管理 CLAUDE.md 上下文文件')
  .addCommand(
    new Command('sync')
      .description('扫描项目结构，更新 CLAUDE.md 中的动态段落')
      .action(async () => {
        const targetDir = process.cwd()
        console.log(pc.bold('\n🔄 G-Forge Context Sync\n'))

        const analyzer = new ContextAnalyzer()
        const result = await analyzer.sync(targetDir)

        if (!result.updated) {
          console.log(pc.green('✓ CLAUDE.md 已是最新，无需更新\n'))
          return
        }

        console.log(pc.green(`更新了 ${result.changes.length} 项：`))
        for (const change of result.changes) {
          console.log(pc.green(`  + ${change}`))
        }
        console.log()
      }),
  )
  .addCommand(
    new Command('check')
      .description('检查 CLAUDE.md 是否与项目实际结构一致')
      .action(async () => {
        const targetDir = process.cwd()
        console.log(pc.bold('\n🔍 G-Forge Context Check\n'))

        const analyzer = new ContextAnalyzer()
        const result = await analyzer.check(targetDir)

        if (result.consistent) {
          console.log(pc.green('✓ CLAUDE.md 与项目结构一致\n'))
          return
        }

        const errors = result.issues.filter((i) => i.severity === 'error')
        const warnings = result.issues.filter((i) => i.severity === 'warning')

        if (errors.length > 0) {
          console.log(pc.red(pc.bold(`Error（${errors.length} 项）：`)))
          for (const issue of errors) {
            console.log(pc.red(`  ${issue.field}：期望 "${issue.expected}"，实际 "${issue.actual}"`))
          }
          console.log()
        }

        if (warnings.length > 0) {
          console.log(pc.yellow(pc.bold(`Warning（${warnings.length} 项）：`)))
          for (const issue of warnings) {
            console.log(pc.yellow(`  ${issue.field}：期望 "${issue.expected}"，实际 "${issue.actual}"`))
          }
          console.log()
        }

        console.log(pc.dim('运行 gforge context sync 可自动修复部分问题\n'))
        process.exitCode = errors.length > 0 ? 1 : 0
      }),
  )

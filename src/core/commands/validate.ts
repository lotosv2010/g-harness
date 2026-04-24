import { Command } from 'commander'
import pc from 'picocolors'
import { RuleValidator } from '../validator/rule-validator.js'
import { autoFix, isFixable } from '../validator/auto-fixer.js'
import type { ValidateOptions } from '../validator/rule-validator.js'

interface CliValidateOptions {
  fix?: boolean
  rule?: string
  format?: string
  severity?: string
}

export const validateCommand = new Command('validate')
  .description('校验项目是否符合 G-Forge 规则')
  .option('--fix', '自动修复可修复的违规（R001、R002、R003）')
  .option('--rule <id>', '仅检查指定规则（如 R005、A003）')
  .option('--format <format>', '输出格式（text | json）', 'text')
  .option('--severity <level>', '最低报告级别（error | warning）', 'warning')
  .action(async (options: CliValidateOptions) => {
    const targetDir = process.cwd()

    console.log(pc.bold('\n🔍 G-Forge 规范校验\n'))

    const validateOptions: ValidateOptions = {
      severity: (options.severity as 'error' | 'warning') ?? 'warning',
      ruleId: options.rule,
    }

    const validator = new RuleValidator()
    const result = await validator.validate(targetDir, validateOptions)

    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2))
      process.exitCode = result.passed ? 0 : 1
      return
    }

    console.log(pc.dim(`扫描了 ${result.summary.filesScanned} 个文件\n`))

    if (result.violations.length === 0 && result.warnings.length === 0) {
      console.log(pc.bold(pc.green('✓ 所有检查通过，无违规项！\n')))
      return
    }

    const errors = result.violations.filter((v) => v.severity === 'error')
    const warns = result.violations.filter((v) => v.severity === 'warning')

    if (errors.length > 0) {
      console.log(pc.red(pc.bold(`Error（${errors.length} 项）：`)))
      for (const v of errors) {
        const loc = v.line ? `${v.file}:${v.line}` : v.file
        console.log(pc.red(`  [${v.ruleId}] ${loc} — ${v.message}`))
      }
      console.log()
    }

    if (warns.length > 0) {
      console.log(pc.yellow(pc.bold(`Warning（${warns.length} 项）：`)))
      for (const v of warns) {
        const loc = v.line ? `${v.file}:${v.line}` : v.file
        console.log(pc.yellow(`  [${v.ruleId}] ${loc} — ${v.message}`))
      }
      console.log()
    }

    console.log(
      pc.dim(`总计: ${result.summary.errors} error, ${result.summary.warnings} warning\n`),
    )

    // --fix 自动修复
    if (options.fix && result.violations.length > 0) {
      const fixable = result.violations.filter(isFixable)
      if (fixable.length > 0) {
        const fixResult = await autoFix(targetDir, result.violations)

        if (fixResult.fixed.length > 0) {
          console.log(pc.green(pc.bold(`自动修复 ${fixResult.fixed.length} 项：`)))
          for (const f of fixResult.fixed) {
            const loc = f.line ? `${f.file}:${f.line}` : f.file
            console.log(pc.green(`  ✓ [${f.ruleId}] ${loc} — ${f.description}`))
          }
          console.log()
        }

        if (fixResult.skipped.length > 0) {
          console.log(pc.dim(`${fixResult.skipped.length} 项需手动修复（不可自动修复）\n`))
        }
      } else {
        console.log(pc.dim('所有违规项均需手动修复（不可自动修复）\n'))
      }
    }

    process.exitCode = result.passed ? 0 : 1
  })

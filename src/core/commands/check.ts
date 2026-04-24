import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { extname } from 'node:path'
import { Command } from 'commander'
import pc from 'picocolors'
import { RuleValidator } from '../validator/rule-validator.js'
import type { ValidateOptions } from '../validator/rule-validator.js'

const execFileAsync = promisify(execFile)

/** 允许检查的源码文件扩展名 */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])

interface CliCheckOptions {
  staged?: boolean
  format?: string
}

/**
 * 通过 git diff 获取变更文件列表
 * @param staged - 是否只获取暂存区变更
 * @returns 变更的文件路径列表（相对于仓库根目录）
 */
async function getChangedFiles(staged: boolean): Promise<string[]> {
  const args = staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR']
    : ['diff', '--name-only', '--diff-filter=ACMR']

  try {
    const { stdout } = await execFileAsync('git', args)
    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`无法获取 git diff：${message}`)
  }
}

/**
 * 过滤出源码文件
 */
function filterSourceFiles(files: string[]): string[] {
  return files.filter((file) => SOURCE_EXTENSIONS.has(extname(file)))
}

export const checkCommand = new Command('check')
  .description('校验 git 变更文件是否符合 G-Forge 规则（轻量级增量检查）')
  .option('--staged', '仅检查暂存区文件（git diff --cached）')
  .option('--format <fmt>', '输出格式（text | json）', 'text')
  .action(async (options: CliCheckOptions) => {
    const targetDir = process.cwd()
    const staged = options.staged ?? false

    console.log(pc.bold(`\n🔍 G-Forge 增量校验${staged ? '（暂存区）' : '（工作区）'}\n`))

    // 获取变更文件
    let changedFiles: string[]
    try {
      changedFiles = await getChangedFiles(staged)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(`错误：${message}`))
      process.exitCode = 1
      return
    }

    // 过滤源码文件
    const sourceFiles = filterSourceFiles(changedFiles)

    if (sourceFiles.length === 0) {
      if (options.format === 'json') {
        console.log(JSON.stringify({
          passed: true,
          violations: [],
          warnings: [],
          summary: { filesScanned: 0, errors: 0, warnings: 0 },
        }, null, 2))
      } else {
        console.log(pc.dim('没有检测到变更的源码文件。\n'))
      }
      return
    }

    // 使用 RuleValidator 校验指定文件
    const validateOptions: ValidateOptions = {
      files: sourceFiles,
    }
    const validator = new RuleValidator()
    const result = await validator.validate(targetDir, validateOptions)

    // JSON 输出
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2))
      process.exitCode = result.passed ? 0 : 1
      return
    }

    // 文本输出
    console.log(pc.dim(`检查了 ${result.summary.filesScanned} 个变更文件\n`))

    if (result.violations.length === 0) {
      console.log(pc.bold(pc.green('✓ 所有变更文件检查通过，无违规项！\n')))
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

    process.exitCode = result.passed ? 0 : 1
  })

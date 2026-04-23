import { readFile, readdir } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import {
  checkFileLength,
  checkFunctionComplexity,
  checkHardcodedSecrets,
  checkStrictTypes,
  checkDefaultExports,
  checkEmptyCatch,
  checkDirectHttpCalls,
} from './checks.js'

export interface ValidationResult {
  passed: boolean
  violations: Violation[]
  warnings: Warning[]
  summary: {
    filesScanned: number
    errors: number
    warnings: number
  }
}

export interface Violation {
  ruleId: string
  severity: 'error' | 'warning'
  file: string
  line: number | null
  message: string
}

export interface Warning {
  ruleId: string
  file: string
  message: string
}

export interface ValidateOptions {
  severity?: 'error' | 'warning'
  ruleId?: string
}

type CheckFn = (file: string, lines: string[], violations: Violation[]) => void

export class RuleValidator {
  private readonly checks: Array<{ ruleId: string; fn: CheckFn }> = [
    { ruleId: 'R005', fn: checkFileLength },
    { ruleId: 'R006', fn: checkFunctionComplexity },
    { ruleId: 'R007', fn: checkHardcodedSecrets },
    { ruleId: 'R001', fn: checkStrictTypes },
    { ruleId: 'R002', fn: checkDefaultExports },
    { ruleId: 'R003', fn: checkEmptyCatch },
    { ruleId: 'A003', fn: checkDirectHttpCalls },
  ]

  async validate(targetDir: string, options?: ValidateOptions): Promise<ValidationResult> {
    const violations: Violation[] = []
    const sourceFiles = await this.collectSourceFiles(targetDir)

    for (const filePath of sourceFiles) {
      const content = await readFile(join(targetDir, filePath), 'utf-8')
      const lines = content.split('\n')

      for (const check of this.checks) {
        if (!options?.ruleId || options.ruleId === check.ruleId) {
          check.fn(filePath, lines, violations)
        }
      }
    }

    const filtered = options?.severity === 'error'
      ? violations.filter((v) => v.severity === 'error')
      : violations

    return {
      passed: filtered.length === 0,
      violations: filtered,
      warnings: [],
      summary: {
        filesScanned: sourceFiles.length,
        errors: violations.filter((v) => v.severity === 'error').length,
        warnings: violations.filter((v) => v.severity === 'warning').length,
      },
    }
  }

  private async collectSourceFiles(rootDir: string): Promise<string[]> {
    const files: string[] = []
    const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs'])
    const ignoreDirs = new Set([
      'node_modules', 'dist', '.git', '.next', '.nuxt', '.output', 'coverage', '__fixtures__',
    ])

    const walk = async (dir: string): Promise<void> => {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }

      for (const entry of entries) {
        if (ignoreDirs.has(entry.name)) continue
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.isFile() && extensions.has(extname(entry.name))) {
          if (this.isExcludedFile(entry.name)) continue
          files.push(relative(rootDir, fullPath))
        }
      }
    }

    await walk(rootDir)
    return files
  }

  private isExcludedFile(name: string): boolean {
    if (name.includes('.test.') || name.includes('.spec.')) return true
    const configPatterns = ['vitest.config', 'eslint.config', 'jest.config', 'prettier.config']
    return configPatterns.some((p) => name.startsWith(p))
  }
}

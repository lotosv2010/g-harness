import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Violation } from './rule-validator.js'

export interface FixResult {
  fixed: FixedViolation[]
  skipped: Violation[]
}

export interface FixedViolation {
  ruleId: string
  file: string
  line: number | null
  description: string
}

// 可自动修复的规则 ID
const FIXABLE_RULES = new Set(['R001', 'R002', 'R003'])

export function isFixable(violation: Violation): boolean {
  return FIXABLE_RULES.has(violation.ruleId)
}

// 对违规项执行自动修复
export async function autoFix(
  targetDir: string,
  violations: Violation[],
): Promise<FixResult> {
  const result: FixResult = { fixed: [], skipped: [] }

  // 按文件分组，每个文件只读写一次
  const byFile = new Map<string, Violation[]>()
  for (const v of violations) {
    if (!isFixable(v)) {
      result.skipped.push(v)
      continue
    }
    const list = byFile.get(v.file) ?? []
    list.push(v)
    byFile.set(v.file, list)
  }

  for (const [file, fileViolations] of byFile) {
    const fullPath = join(targetDir, file)
    const content = await readFile(fullPath, 'utf-8')
    const lines = content.split('\n')

    const fixedItems = applyFixes(lines, fileViolations)
    if (fixedItems.length > 0) {
      await writeFile(fullPath, lines.join('\n'), 'utf-8')
      result.fixed.push(...fixedItems.map((f) => ({ ...f, file })))
    }
  }

  return result
}

function applyFixes(
  lines: string[],
  violations: Violation[],
): Array<{ ruleId: string; line: number | null; description: string }> {
  const fixed: Array<{ ruleId: string; line: number | null; description: string }> = []

  // 按行号降序排列，从文件末尾向前修复，避免行号偏移
  const sorted = [...violations].sort((a, b) => (b.line ?? 0) - (a.line ?? 0))

  for (const v of sorted) {
    if (v.line === null) continue
    const idx = v.line - 1
    if (idx < 0 || idx >= lines.length) continue

    const line = lines[idx]

    // R001: @ts-ignore → @ts-expect-error
    if (v.ruleId === 'R001' && line.includes('@ts-ignore')) {
      lines[idx] = line.replace(/@ts-ignore/, '@ts-expect-error // TODO: 添加具体原因')
      fixed.push({ ruleId: 'R001', line: v.line, description: '@ts-ignore → @ts-expect-error' })
      continue
    }

    // R002: export default → 命名导出
    if (v.ruleId === 'R002' && /^export\s+default\b/.test(line.trim())) {
      const replaced = fixDefaultExport(line)
      if (replaced !== null) {
        lines[idx] = replaced
        fixed.push({ ruleId: 'R002', line: v.line, description: '默认导出 → 命名导出' })
      }
      continue
    }

    // R003: 空 catch → 添加注释
    if (v.ruleId === 'R003') {
      const nextNonEmpty = lines.slice(idx + 1).findIndex((l) => l.trim().length > 0)
      if (nextNonEmpty >= 0 && lines[idx + 1 + nextNonEmpty].trim() === '}') {
        const indent = lines[idx].match(/^\s*/)?.[0] ?? ''
        lines.splice(idx + 1, 0, `${indent}  // TODO: 处理错误`)
        fixed.push({ ruleId: 'R003', line: v.line, description: '空 catch → 添加 TODO 注释' })
      }
      continue
    }
  }

  return fixed
}

// 尝试将 export default 转为命名导出
function fixDefaultExport(line: string): string | null {
  // export default function foo() → export function foo()
  const funcMatch = line.match(/^(\s*)export\s+default\s+(function\s+\w+)/)
  if (funcMatch) {
    return `${funcMatch[1]}export ${funcMatch[2]}`
  }

  // export default class Foo → export class Foo
  const classMatch = line.match(/^(\s*)export\s+default\s+(class\s+\w+)/)
  if (classMatch) {
    return `${classMatch[1]}export ${classMatch[2]}`
  }

  // export default { ... } 或 export default variable — 无法安全修复
  return null
}

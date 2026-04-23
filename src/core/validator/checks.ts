import type { Violation, Warning } from './rule-validator.js'

export function checkFileLength(file: string, lines: string[], violations: Violation[]): void {
  if (file.includes('.test.') || file.includes('.spec.')) return

  if (lines.length > 300) {
    violations.push({
      ruleId: 'R005',
      severity: 'error',
      file,
      line: null,
      message: `文件 ${lines.length} 行，超过 300 行上限`,
    })
  } else if (lines.length > 200) {
    violations.push({
      ruleId: 'R005',
      severity: 'warning',
      file,
      line: null,
      message: `文件 ${lines.length} 行，超过 200 行建议阈值，考虑拆分`,
    })
  }
}

export function checkFunctionComplexity(file: string, lines: string[], violations: Violation[]): void {
  let funcStart: number | null = null
  let funcName = ''
  let braceDepth = 0
  let inFunction = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const funcMatch = line.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:async\s+)?\(.*\)\s*(?:=>|{)/,
    )

    if (funcMatch && !inFunction) {
      funcName = funcMatch[1] ?? funcMatch[2] ?? 'anonymous'
      funcStart = i + 1
      inFunction = true
      braceDepth = 0
    }

    if (inFunction) {
      for (const ch of line) {
        if (ch === '{') braceDepth++
        if (ch === '}') braceDepth--
      }

      if (braceDepth <= 0 && funcStart !== null) {
        const funcLength = i - funcStart + 2
        if (funcLength > 40) {
          violations.push({
            ruleId: 'R006',
            severity: 'warning',
            file,
            line: funcStart,
            message: `函数 "${funcName}" 有 ${funcLength} 行，超过 40 行上限`,
          })
        }
        inFunction = false
        funcStart = null
      }
    }
  }
}

export function checkHardcodedSecrets(file: string, lines: string[], violations: Violation[]): void {
  const patterns = [
    { regex: /['"]sk-[a-zA-Z0-9]{20,}['"]/, desc: 'API 密钥' },
    { regex: /['"]ghp_[a-zA-Z0-9]{36}['"]/, desc: 'GitHub Token' },
    { regex: /['"]xox[bpras]-[a-zA-Z0-9-]{10,}['"]/, desc: 'Slack Token' },
    { regex: /(password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]{8,}['"]/, desc: '疑似硬编码密钥' },
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue

    for (const { regex, desc } of patterns) {
      if (regex.test(line)) {
        violations.push({
          ruleId: 'R007',
          severity: 'error',
          file,
          line: i + 1,
          message: `检测到${desc}硬编码`,
        })
      }
    }
  }
}

export function checkStrictTypes(file: string, lines: string[], violations: Violation[]): void {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return

  const tsIgnorePattern = new RegExp('@ts-' + 'ignore')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
      if (line.trimStart().startsWith('//')) continue
      violations.push({
        ruleId: 'R001',
        severity: 'error',
        file,
        line: i + 1,
        message: '使用了 any 类型，应使用 unknown + 类型守卫替代',
      })
    }

    if (tsIgnorePattern.test(line)) {
      violations.push({
        ruleId: 'R001',
        severity: 'error',
        file,
        line: i + 1,
        message: '使用了 @ts-' + 'ignore，应使用 @ts-expect-error 并附带原因',
      })
    }
  }
}

export function checkDefaultExports(file: string, lines: string[], violations: Violation[]): void {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return

  for (let i = 0; i < lines.length; i++) {
    if (/^export\s+default\b/.test(lines[i].trim())) {
      violations.push({
        ruleId: 'R002',
        severity: 'warning',
        file,
        line: i + 1,
        message: '使用了默认导出，应使用命名导出',
      })
    }
  }
}

export function checkEmptyCatch(file: string, lines: string[], violations: Violation[]): void {
  for (let i = 0; i < lines.length - 1; i++) {
    if (/catch\s*\(/.test(lines[i]) || /catch\s*{/.test(lines[i])) {
      const nextNonEmpty = lines.slice(i + 1).findIndex((l) => l.trim().length > 0)
      if (nextNonEmpty >= 0) {
        const nextLine = lines[i + 1 + nextNonEmpty].trim()
        if (nextLine === '}') {
          violations.push({
            ruleId: 'R003',
            severity: 'error',
            file,
            line: i + 1,
            message: '空 catch 块，错误必须被处理或显式传播',
          })
        }
      }
    }
  }
}

export function checkDirectHttpCalls(
  file: string,
  lines: string[],
  violations: Violation[],
): void {
  const isApiLayer = file.includes('/api/') || file.includes('/services/') || file.includes('/routes/')
  if (isApiLayer) return

  const patterns = [
    { regex: new RegExp('\\b' + 'fetch' + '\\s*\\('), desc: 'fet' + 'ch()' },
    { regex: new RegExp('\\b' + 'axi' + 'os' + '\\b'), desc: 'axi' + 'os' },
    { regex: new RegExp('new\\s+XML' + 'HttpRequest'), desc: 'XML' + 'HttpRequest' },
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue
    if (line.includes('import')) continue

    for (const { regex, desc } of patterns) {
      if (regex.test(line)) {
        violations.push({
          ruleId: 'A003',
          severity: 'warning',
          file,
          line: i + 1,
          message: `在非 API 层文件中直接调用 ${desc}，应通过 API 层发起`,
        })
      }
    }
  }
}

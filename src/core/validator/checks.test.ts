import { describe, it, expect } from 'vitest'
import type { Violation } from './rule-validator.js'
import {
  checkFileLength,
  checkFunctionComplexity,
  checkHardcodedSecrets,
  checkStrictTypes,
  checkDefaultExports,
  checkEmptyCatch,
  checkDirectHttpCalls,
} from './checks.js'

function makeLines(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `// line ${i + 1}`)
}

function collect(fn: (file: string, lines: string[], v: Violation[]) => void, file: string, lines: string[]): Violation[] {
  const violations: Violation[] = []
  fn(file, lines, violations)
  return violations
}

describe('checkFileLength', () => {
  it('passes for files under 200 lines', () => {
    const v = collect(checkFileLength, 'src/foo.ts', makeLines(150))
    expect(v).toHaveLength(0)
  })

  it('warns for files over 200 lines', () => {
    const v = collect(checkFileLength, 'src/foo.ts', makeLines(250))
    expect(v).toHaveLength(1)
    expect(v[0].severity).toBe('warning')
    expect(v[0].ruleId).toBe('R005')
  })

  it('errors for files over 300 lines', () => {
    const v = collect(checkFileLength, 'src/foo.ts', makeLines(350))
    expect(v).toHaveLength(1)
    expect(v[0].severity).toBe('error')
  })

  it('skips test files', () => {
    const v = collect(checkFileLength, 'src/foo.test.ts', makeLines(350))
    expect(v).toHaveLength(0)
  })

  it('skips spec files', () => {
    const v = collect(checkFileLength, 'src/foo.spec.ts', makeLines(350))
    expect(v).toHaveLength(0)
  })
})

describe('checkFunctionComplexity', () => {
  it('passes for short functions', () => {
    const lines = [
      'export function short() {',
      '  return 1',
      '}',
    ]
    const v = collect(checkFunctionComplexity, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })

  it('warns for functions over 40 lines', () => {
    const lines = [
      'function longFn() {',
      ...Array.from({ length: 45 }, () => '  const x = 1'),
      '}',
    ]
    const v = collect(checkFunctionComplexity, 'src/foo.ts', lines)
    expect(v).toHaveLength(1)
    expect(v[0].severity).toBe('warning')
    expect(v[0].ruleId).toBe('R006')
    expect(v[0].message).toContain('longFn')
  })
})

describe('checkHardcodedSecrets', () => {
  it('detects API keys', () => {
    const lines = ['const key = "sk-abcdefghijklmnopqrstuvwxyz1234"']
    const v = collect(checkHardcodedSecrets, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
    expect(v[0].severity).toBe('error')
    expect(v[0].ruleId).toBe('R007')
  })

  it('detects GitHub tokens', () => {
    const lines = ['const token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"']
    const v = collect(checkHardcodedSecrets, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
  })

  it('detects password assignments', () => {
    const lines = ['const password = "mysecretpassword123"']
    const v = collect(checkHardcodedSecrets, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
  })

  it('ignores comments', () => {
    const lines = ['// const key = "sk-abcdefghijklmnopqrstuvwxyz1234"']
    const v = collect(checkHardcodedSecrets, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })

  it('passes clean code', () => {
    const lines = ['const key = process.env.API_KEY']
    const v = collect(checkHardcodedSecrets, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })
})

describe('checkStrictTypes', () => {
  it('detects any type annotation', () => {
    const lines = ['function foo(x: any) {}']
    const v = collect(checkStrictTypes, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
    expect(v[0].ruleId).toBe('R001')
  })

  it('detects as any cast', () => {
    const lines = ['const x = bar as any']
    const v = collect(checkStrictTypes, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
  })

  it('detects ts-ignore', () => {
    const lines = ['// @ts-' + 'ignore']
    const v = collect(checkStrictTypes, 'src/foo.ts', lines)
    expect(v.length).toBeGreaterThan(0)
  })

  it('skips non-TS files', () => {
    const lines = ['function foo(x: any) {}']
    const v = collect(checkStrictTypes, 'src/foo.js', lines)
    expect(v).toHaveLength(0)
  })

  it('passes clean TS code', () => {
    const lines = ['function foo(x: unknown) {}']
    const v = collect(checkStrictTypes, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })
})

describe('checkDefaultExports', () => {
  it('detects default exports', () => {
    const lines = ['export default function foo() {}']
    const v = collect(checkDefaultExports, 'src/foo.ts', lines)
    expect(v).toHaveLength(1)
    expect(v[0].ruleId).toBe('R002')
  })

  it('passes named exports', () => {
    const lines = ['export function foo() {}']
    const v = collect(checkDefaultExports, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })

  it('skips non-TS files', () => {
    const lines = ['export default function foo() {}']
    const v = collect(checkDefaultExports, 'src/foo.js', lines)
    expect(v).toHaveLength(0)
  })
})

describe('checkEmptyCatch', () => {
  it('detects empty catch blocks', () => {
    const lines = [
      'try {',
      '  doSomething()',
      '} catch (e) {',
      '}',
    ]
    const v = collect(checkEmptyCatch, 'src/foo.ts', lines)
    expect(v).toHaveLength(1)
    expect(v[0].ruleId).toBe('R003')
  })

  it('passes catch with handling', () => {
    const lines = [
      'try {',
      '  doSomething()',
      '} catch (e) {',
      '  console.error(e)',
      '}',
    ]
    const v = collect(checkEmptyCatch, 'src/foo.ts', lines)
    expect(v).toHaveLength(0)
  })
})

describe('checkDirectHttpCalls', () => {
  it('flags direct fetch in non-API files', () => {
    const line = 'const data = ' + 'fetch' + '("https://example.com")'
    const v = collect(checkDirectHttpCalls, 'src/components/foo.ts', [line])
    expect(v).toHaveLength(1)
    expect(v[0].ruleId).toBe('A003')
  })

  it('skips API layer files', () => {
    const line = 'const data = ' + 'fetch' + '("https://example.com")'
    const v = collect(checkDirectHttpCalls, 'src/api/client.ts', [line])
    expect(v).toHaveLength(0)
  })

  it('skips services layer files', () => {
    const line = 'const data = ' + 'fetch' + '("https://example.com")'
    const v = collect(checkDirectHttpCalls, 'src/services/api.ts', [line])
    expect(v).toHaveLength(0)
  })

  it('skips import lines', () => {
    const lines = ['import ' + 'axios' + " from 'axi' + 'os'"]
    const v = collect(checkDirectHttpCalls, 'src/components/foo.ts', lines)
    expect(v).toHaveLength(0)
  })

  it('skips comments', () => {
    const lines = ['// use ' + 'fetch' + ' for HTTP calls']
    const v = collect(checkDirectHttpCalls, 'src/components/foo.ts', lines)
    expect(v).toHaveLength(0)
  })
})

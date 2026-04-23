import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { RuleValidator } from './rule-validator.js'

const fixturesDir = join(import.meta.dirname, '__fixtures__')

describe('RuleValidator', () => {
  const validator = new RuleValidator()

  it('returns passed=true for clean project', async () => {
    const result = await validator.validate(join(fixturesDir, 'clean'))
    expect(result.passed).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('detects any type violations', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'), { ruleId: 'R001' })
    expect(result.violations.some((v) => v.ruleId === 'R001')).toBe(true)
  })

  it('detects default export violations', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'), { ruleId: 'R002' })
    expect(result.violations.some((v) => v.ruleId === 'R002')).toBe(true)
  })

  it('detects empty catch violations', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'), { ruleId: 'R003' })
    expect(result.violations.some((v) => v.ruleId === 'R003')).toBe(true)
  })

  it('filters by severity', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'), { severity: 'error' })
    for (const v of result.violations) {
      expect(v.severity).toBe('error')
    }
  })

  it('filters by ruleId', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'), { ruleId: 'R001' })
    for (const v of result.violations) {
      expect(v.ruleId).toBe('R001')
    }
  })

  it('reports correct summary counts', async () => {
    const result = await validator.validate(join(fixturesDir, 'violations'))
    expect(result.summary.filesScanned).toBeGreaterThan(0)
    expect(result.summary.errors + result.summary.warnings).toBe(result.violations.length)
  })

  it('handles non-existent directory gracefully', async () => {
    const result = await validator.validate(join(fixturesDir, 'does-not-exist'))
    expect(result.passed).toBe(true)
    expect(result.summary.filesScanned).toBe(0)
  })
})

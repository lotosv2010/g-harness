// Rule checks 冒烟测试：覆盖 R005 / R002 / R003（v0.2.0）

import { describe, it, expect } from 'vitest'
import {
  checkFileLength,
  checkDefaultExports,
  checkEmptyCatch,
} from '../../../src/core/validator/checks.js'

describe('checkFileLength (R005)', () => {
  it('301 行触发 error', () => {
    const lines = Array.from({ length: 301 }, () => 'line')
    const violations = checkFileLength('foo.ts', lines)
    expect(violations).toHaveLength(1)
    expect(violations[0].severity).toBe('error')
    expect(violations[0].ruleId).toBe('R005')
  })

  it('201-300 行触发 warning', () => {
    const lines = Array.from({ length: 250 }, () => 'line')
    const violations = checkFileLength('foo.ts', lines)
    expect(violations[0].severity).toBe('warning')
  })

  it('测试文件跳过检查', () => {
    const lines = Array.from({ length: 400 }, () => 'line')
    expect(checkFileLength('foo.test.ts', lines)).toEqual([])
  })
})

describe('checkDefaultExports (R002)', () => {
  it('检测 export default', () => {
    const violations = checkDefaultExports('foo.ts', ['export default function bar() {}'])
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('R002')
  })

  it('命名导出通过', () => {
    expect(checkDefaultExports('foo.ts', ['export function bar() {}'])).toEqual([])
  })
})

describe('checkEmptyCatch (R003)', () => {
  it('空 catch 块触发错误（多行形式）', () => {
    const lines = ['try {', '  doThing()', '} catch (e) {', '}', '']
    const violations = checkEmptyCatch('foo.ts', lines)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0].ruleId).toBe('R003')
  })

  it('非空 catch 不触发', () => {
    const lines = ['try {', '  doThing()', '} catch (e) {', '  console.error(e)', '}', '']
    expect(checkEmptyCatch('foo.ts', lines)).toEqual([])
  })
})

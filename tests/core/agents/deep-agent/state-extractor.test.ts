// Deep Agent state-extractor 纯函数测试（v0.2.0）

import { describe, it, expect } from 'vitest'
import { tmpdir } from 'node:os'
import {
  canonicalPath,
  coerceFileContent,
  extractVirtualFiles,
  filterWhitelist,
  truncate,
} from '../../../../src/core/agents/deep-agent/state-extractor.js'

describe('canonicalPath', () => {
  it('剥离沙盒前缀并统一分隔符', () => {
    expect(canonicalPath('\\app\\docs\\SPEC.md')).toBe('docs/SPEC.md')
    expect(canonicalPath('/sandbox/AGENTS.md')).toBe('AGENTS.md')
    expect(canonicalPath('./CLAUDE.md')).toBe('CLAUDE.md')
    expect(canonicalPath('C:/workspace/docs/ARCHITECTURE.md')).toBe('docs/ARCHITECTURE.md')
  })
})

describe('coerceFileContent', () => {
  it('支持字符串 / 数组 / FileData 形态', () => {
    expect(coerceFileContent('hello')).toBe('hello')
    expect(coerceFileContent(['a', 'b'])).toBe('a\nb')
    expect(coerceFileContent({ content: 'x' })).toBe('x')
    expect(coerceFileContent({ content: ['y', 'z'] })).toBe('y\nz')
    expect(coerceFileContent(42)).toBeNull()
  })
})

describe('extractVirtualFiles', () => {
  it('从 deepagents state.files 提取 (path → content)', () => {
    const state = {
      files: {
        'docs/SPEC.md': 'spec content',
        'AGENTS.md': { content: ['line1', 'line2'] },
        badEntry: 42,
      },
    }
    const files = extractVirtualFiles(state)
    expect(files['docs/SPEC.md']).toBe('spec content')
    expect(files['AGENTS.md']).toBe('line1\nline2')
    expect(files.badEntry).toBeUndefined()
  })

  it('state 为非对象时返回空表', () => {
    expect(extractVirtualFiles(null)).toEqual({})
    expect(extractVirtualFiles({ files: null })).toEqual({})
  })
})

describe('filterWhitelist', () => {
  const targetDir = tmpdir()
  const whitelist = ['AGENTS.md', 'docs/SPEC.md', '.claude/rules/architecture.md']

  it('保留白名单内路径，拒绝白名单外路径', () => {
    const files = {
      'AGENTS.md': '# Agents',
      'sandbox/docs/SPEC.md': '# Spec',
      'docs/ARCHITECTURE.md': '# Arch',
      '.claude/rules/architecture.md': '# A',
    }
    const { drafts, rejected } = filterWhitelist(files, whitelist, targetDir)
    const paths = drafts.map((d) => d.outputPath).sort()
    expect(paths).toEqual(['.claude/rules/architecture.md', 'AGENTS.md', 'docs/SPEC.md'])
    expect(rejected.some((r) => r.includes('docs/ARCHITECTURE.md'))).toBe(true)
  })

  it('拒绝触发安全检查的路径（如 .env）', () => {
    const files = { '.env': 'SECRET=xxx' }
    const { drafts, rejected } = filterWhitelist(files, ['.env'], targetDir)
    expect(drafts).toHaveLength(0)
    expect(rejected.length).toBeGreaterThan(0)
  })
})

describe('truncate', () => {
  it('去除多余空白并按长度截断', () => {
    expect(truncate('  a   b\n\tc  ', 5)).toBe('a b c')
    expect(truncate('abcdefghij', 3)).toBe('abc…')
  })
})

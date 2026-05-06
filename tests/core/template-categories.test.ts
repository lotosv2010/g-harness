// 模板类别 + 子项过滤逻辑测试

import { describe, it, expect } from 'vitest'
import {
  TEMPLATE_CATEGORIES,
  filterBySelection,
  categorizeFile,
  getDefaultCategoryIds,
  getRequiredCategoryIds,
  buildDefaultSelection,
} from '../../src/core/template-categories.js'
import type { CategorySelectionMap } from '../../src/core/template-categories.js'

describe('categorizeFile', () => {
  it('识别 rules 类别', () => {
    expect(categorizeFile('.ai/rules/architecture.md')?.id).toBe('rules')
  })

  it('识别 protocols 类别', () => {
    expect(categorizeFile('.ai/protocols/feature.md')?.id).toBe('protocols')
  })

  it('识别 skills 类别', () => {
    expect(categorizeFile('.ai/skills/feat/SKILL.md')?.id).toBe('skills')
  })

  it('识别 guardrails 类别', () => {
    expect(categorizeFile('.ai/guardrails/boundary-rules.json')?.id).toBe('guardrails')
  })

  it('识别 hooks 类别', () => {
    expect(categorizeFile('.ai/hooks/pre-commit.mjs')?.id).toBe('hooks')
  })

  it('识别 docs 类别', () => {
    expect(categorizeFile('docs/SPEC.md')?.id).toBe('docs')
    expect(categorizeFile('docs/tasks/BOARD.md')?.id).toBe('docs')
  })

  it('识别 AGENTS.md 入口', () => {
    expect(categorizeFile('AGENTS.md')?.id).toBe('agents-entry')
  })

  it('不属于任何类别的文件返回 null', () => {
    expect(categorizeFile('CLAUDE.md')).toBeNull()
    expect(categorizeFile('.cursorrules')).toBeNull()
  })
})

describe('filterBySelection', () => {
  const files = [
    { outputPath: '.ai/rules/architecture.md' },
    { outputPath: '.ai/rules/code-quality.md' },
    { outputPath: '.ai/rules/safety.md' },
    { outputPath: '.ai/protocols/feature.md' },
    { outputPath: '.ai/protocols/bugfix.md' },
    { outputPath: '.ai/skills/feat/SKILL.md' },
    { outputPath: '.ai/skills/pr/SKILL.md' },
    { outputPath: '.ai/skills/security/SKILL.md' },
    { outputPath: '.ai/guardrails/boundary-rules.json' },
    { outputPath: 'docs/SPEC.md' },
    { outputPath: 'docs/ARCHITECTURE.md' },
    { outputPath: 'docs/tasks/BOARD.md' },
    { outputPath: 'AGENTS.md' },
    { outputPath: 'CLAUDE.md' },
  ]

  it('仅启用 rules 类别 → 只保留 rules + 无类别文件', () => {
    const sel: CategorySelectionMap = { rules: ['architecture', 'code-quality', 'safety'] }
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('.ai/rules/architecture.md')
    expect(paths).toContain('.ai/rules/safety.md')
    expect(paths).toContain('CLAUDE.md')
    expect(paths).not.toContain('.ai/protocols/feature.md')
    expect(paths).not.toContain('docs/SPEC.md')
  })

  it('rules 类别只选 architecture → 排除 code-quality 和 safety', () => {
    const sel: CategorySelectionMap = { rules: ['architecture'] }
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('.ai/rules/architecture.md')
    expect(paths).not.toContain('.ai/rules/code-quality.md')
    expect(paths).not.toContain('.ai/rules/safety.md')
  })

  it('skills 只选 feat + pr → 排除 security', () => {
    const sel: CategorySelectionMap = { skills: ['feat', 'pr'] }
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('.ai/skills/feat/SKILL.md')
    expect(paths).toContain('.ai/skills/pr/SKILL.md')
    expect(paths).not.toContain('.ai/skills/security/SKILL.md')
  })

  it('docs 只选 spec + tasks → 排除 architecture', () => {
    const sel: CategorySelectionMap = { docs: ['spec', 'tasks'] }
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('docs/SPEC.md')
    expect(paths).toContain('docs/tasks/BOARD.md')
    expect(paths).not.toContain('docs/ARCHITECTURE.md')
  })

  it('空子项列表 = 全量安装该类别', () => {
    const sel: CategorySelectionMap = { rules: [] }
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('.ai/rules/architecture.md')
    expect(paths).toContain('.ai/rules/code-quality.md')
    expect(paths).toContain('.ai/rules/safety.md')
  })

  it('无类别归属文件始终放行', () => {
    const sel: CategorySelectionMap = {}
    const result = filterBySelection(files, sel)
    const paths = result.map((f) => f.outputPath)
    expect(paths).toContain('CLAUDE.md')
    expect(paths).toHaveLength(1)
  })
})

describe('getDefaultCategoryIds / getRequiredCategoryIds', () => {
  it('默认选中列表包含 rules', () => {
    expect(getDefaultCategoryIds()).toContain('rules')
  })

  it('必选列表包含 rules', () => {
    expect(getRequiredCategoryIds()).toContain('rules')
  })

  it('hooks 默认不选中', () => {
    expect(getDefaultCategoryIds()).not.toContain('hooks')
  })
})

describe('buildDefaultSelection', () => {
  it('包含所有 defaultSelected 类别', () => {
    const sel = buildDefaultSelection()
    expect('rules' in sel).toBe(true)
    expect('protocols' in sel).toBe(true)
    expect('skills' in sel).toBe(true)
    expect('hooks' in sel).toBe(false)
  })

  it('skills 默认只选 feat', () => {
    const sel = buildDefaultSelection()
    expect(sel.skills).toContain('feat')
    expect(sel.skills).not.toContain('test-gen')
    expect(sel.skills).not.toContain('pr')
    expect(sel.skills).not.toContain('release')
    expect(sel.skills).not.toContain('scaffold')
    expect(sel.skills).not.toContain('analyze')
    expect(sel.skills).not.toContain('debt')
    expect(sel.skills).not.toContain('security')
  })
})

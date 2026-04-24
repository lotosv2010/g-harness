import { describe, it, expect } from 'vitest'
import { FileGenerator } from './file-generator.js'

// 通过子类暴露 private 方法用于测试
class TestableFileGenerator extends FileGenerator {
  testIsCoreFile(outputPath: string): boolean {
    return (this as unknown as { isCoreFile: (p: string) => boolean }).isCoreFile(outputPath)
  }
}

describe('FileGenerator', () => {
  describe('isCoreFile', () => {
    const gen = new TestableFileGenerator()

    it('核心文件：CLAUDE.md 和 AGENTS.md', () => {
      expect(gen.testIsCoreFile('CLAUDE.md')).toBe(true)
      expect(gen.testIsCoreFile('AGENTS.md')).toBe(true)
    })

    it('核心文件：.claude/rules/ 下所有文件', () => {
      expect(gen.testIsCoreFile('.claude/rules/architecture.md')).toBe(true)
      expect(gen.testIsCoreFile('.claude/rules/code-quality.md')).toBe(true)
      expect(gen.testIsCoreFile('.claude/rules/safety.md')).toBe(true)
    })

    it('核心文件：.claude/protocols/ 下所有文件', () => {
      expect(gen.testIsCoreFile('.claude/protocols/feature.md')).toBe(true)
      expect(gen.testIsCoreFile('.claude/protocols/bugfix.md')).toBe(true)
    })

    it('核心文件：docs/ARCHITECTURE.md 和 docs/SPEC.md', () => {
      expect(gen.testIsCoreFile('docs/ARCHITECTURE.md')).toBe(true)
      expect(gen.testIsCoreFile('docs/SPEC.md')).toBe(true)
    })

    it('核心文件：.claude/hooks/ 下所有文件', () => {
      expect(gen.testIsCoreFile('.claude/hooks/post-write-boundary-check.mjs')).toBe(true)
      expect(gen.testIsCoreFile('.claude/hooks/README.md')).toBe(true)
    })

    it('核心文件：.claude/settings.json', () => {
      expect(gen.testIsCoreFile('.claude/settings.json')).toBe(true)
    })

    it('非核心文件：guardrails、prompts、skills', () => {
      expect(gen.testIsCoreFile('.claude/guardrails/boundary-check.md')).toBe(false)
      expect(gen.testIsCoreFile('.claude/prompts/feature-dev.md')).toBe(false)
      expect(gen.testIsCoreFile('.claude/skills/analyze/SKILL.md')).toBe(false)
    })

    it('非核心文件：扩展文档（DESIGN、API、DATA_MODEL 等）', () => {
      expect(gen.testIsCoreFile('docs/DESIGN.md')).toBe(false)
      expect(gen.testIsCoreFile('docs/API.md')).toBe(false)
      expect(gen.testIsCoreFile('docs/DATA_MODEL.md')).toBe(false)
      expect(gen.testIsCoreFile('docs/decisions/ADR.md')).toBe(false)
      expect(gen.testIsCoreFile('docs/tasks/BOARD.md')).toBe(false)
      expect(gen.testIsCoreFile('docs/team/ROLES.md')).toBe(false)
    })

    it('非核心文件：tools、tests', () => {
      expect(gen.testIsCoreFile('tools/prompts/README.md')).toBe(false)
      expect(gen.testIsCoreFile('tests/README.md')).toBe(false)
    })
  })
})

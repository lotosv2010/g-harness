// AgentAdapter 映射与过滤的冒烟测试（v0.2.0）

import { describe, it, expect } from 'vitest'
import { AgentAdapter } from '../../../src/core/agents/agent-adapter.js'
import { AGENT_REGISTRY, getAgent } from '../../../src/core/agents/agent-registry.js'

describe('AgentAdapter.mapOutputPath', () => {
  const adapter = new AgentAdapter()

  it('将 .ai/ 前缀映射为 Claude 的 .claude/', () => {
    const claude = getAgent('claude')!
    expect(adapter.mapOutputPath('.ai/rules/architecture.md', claude)).toBe(
      '.claude/rules/architecture.md',
    )
  })

  it('将 .ai/ 前缀映射为 Cursor 的 .cursor/', () => {
    const cursor = getAgent('cursor')!
    expect(adapter.mapOutputPath('.ai/rules/safety.md', cursor)).toBe(
      '.cursor/rules/safety.md',
    )
  })

  it('对无 configDir 的 agent（generic）保持原路径', () => {
    const generic = getAgent('generic')!
    expect(adapter.mapOutputPath('.ai/rules/foo.md', generic)).toBe('.ai/rules/foo.md')
  })
})

describe('AgentAdapter.filterSupported', () => {
  const adapter = new AgentAdapter()

  it('非 Claude agent 过滤掉 hooks / skills / protocols / prompts', () => {
    const cursor = getAgent('cursor')!
    const files = [
      { outputPath: '.ai/rules/r.md', content: '' },
      { outputPath: '.ai/hooks/h.mjs', content: '' },
      { outputPath: '.ai/skills/s/SKILL.md', content: '' },
      { outputPath: '.ai/protocols/p.md', content: '' },
      { outputPath: '.ai/prompts/x.md', content: '' },
    ]
    const kept = adapter.filterSupported(files, cursor).map((f) => f.outputPath)
    expect(kept).toEqual(['.ai/rules/r.md'])
  })
})

describe('AGENT_REGISTRY 完整性', () => {
  it('Claude 是唯一支持全量能力的 agent', () => {
    const claude = getAgent('claude')!
    expect(claude.supportsHooks).toBe(true)
    expect(claude.supportsSkills).toBe(true)
    expect(claude.supportsProtocols).toBe(true)
    expect(claude.supportsGuardrails).toBe(true)
  })

  it('每个非 generic agent 必须声明 entryFile / entryTemplate', () => {
    for (const a of AGENT_REGISTRY) {
      if (a.id === 'generic') continue
      expect(a.entryFile.length).toBeGreaterThan(0)
      expect(a.entryTemplate.length).toBeGreaterThan(0)
    }
  })
})

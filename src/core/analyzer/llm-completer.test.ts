import { describe, it, expect, vi } from 'vitest'
import { enhanceWithLlm } from './llm-completer.js'
import type { ContentCompletion } from './content-completer.js'
import type { DescriptionAnalysis } from './description-analyzer.js'
import type { ScanResult } from '../scanner/project-scanner.js'

const RULE_BASED: ContentCompletion = {
  projectPositioning: '[rule] positioning',
  coreValueTable: '[rule] value table',
  productBoundaries: '[rule] boundaries',
  initialFeatures: '[rule] features',
  nfrHints: '[rule] nfr',
  architectureOverview: '[rule] arch',
  moduleBreakdown: '[rule] modules',
  projectStructureHint: '[rule] structure',
}

const ANALYSIS: DescriptionAnalysis = {
  appType: 'web-app',
  domain: null,
  features: [],
  suggestedModules: [],
  confidence: 0.5,
}

const SCAN: ScanResult = {
  techStack: {
    framework: 'Next.js',
    language: 'TypeScript',
    buildTool: null,
    packageManager: 'pnpm',
    runtime: 'node',
  },
  structure: {
    rootDir: '/tmp/demo',
    isMonorepo: false,
    packages: [],
    srcDir: 'src',
  },
  existingConfig: {
    hasClaudeMd: false,
    hasAgentsMd: false,
    hasEslint: false,
    hasTsConfig: false,
  },
}

describe('enhanceWithLlm', () => {
  it('无 API key → 降级到规则版，reason=no-key', async () => {
    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: 'a demo app',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: undefined, OPENAI_API_KEY: undefined },
    })
    expect(r.enhanced).toBe(false)
    expect(r.provider).toBeNull()
    expect(r.reason).toBe('no-key')
    expect(r.completion).toBe(RULE_BASED)
  })

  it('有 Anthropic key → 调用 anthropic，返回合法 JSON → 覆盖字段', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projectPositioning: '[llm] positioning',
              moduleBreakdown: '[llm] modules',
            }),
          },
        ],
      }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })

    expect(r.provider).toBe('anthropic')
    expect(r.enhanced).toBe(true)
    expect(r.completion.projectPositioning).toBe('[llm] positioning')
    expect(r.completion.moduleBreakdown).toBe('[llm] modules')
    // 未被覆盖的字段保持规则版
    expect(r.completion.productBoundaries).toBe('[rule] boundaries')
    expect(r.completion.coreValueTable).toBe('[rule] value table')
  })

  it('LLM 返回代码块围栏 → 容错解析', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '```json\n{"productBoundaries": "[llm] b"}\n```',
          },
        ],
      }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    expect(r.enhanced).toBe(true)
    expect(r.completion.productBoundaries).toBe('[llm] b')
  })

  it('LLM 返回非 JSON → parse-error 降级', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'I cannot do this' }] }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    expect(r.enhanced).toBe(false)
    expect(r.reason).toBe('parse-error')
    expect(r.completion).toBe(RULE_BASED)
  })

  it('HTTP 非 2xx → network-error 降级', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    expect(r.enhanced).toBe(false)
    expect(r.reason).toBe('network-error')
  })

  it('fetch 抛 AbortError → timeout 降级', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    expect(r.enhanced).toBe(false)
    expect(r.reason).toBe('timeout')
  })

  it('OpenAI 路径：只有 OPENAI_API_KEY 时调用 openai 端点', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ projectPositioning: '[llm] p' }) } },
        ],
      }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { OPENAI_API_KEY: 'sk-openai-fake', ANTHROPIC_API_KEY: undefined },
      fetchImpl,
    })
    expect(r.provider).toBe('openai')
    expect(r.enhanced).toBe(true)
    expect(r.completion.projectPositioning).toBe('[llm] p')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.any(Object),
    )
  })

  it('LLM 返回空对象 → enhanced=false, reason=empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: '{}' }] }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    expect(r.enhanced).toBe(false)
    expect(r.reason).toBe('empty')
    expect(r.completion).toStrictEqual(RULE_BASED)
  })

  it('LLM 返回白名单外字段 → 被忽略', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              projectPositioning: '[llm] p',
              coreValueTable: '[llm-illegal] table',
              someRandomField: 'ignored',
            }),
          },
        ],
      }),
    }) as unknown as typeof fetch

    const r = await enhanceWithLlm({
      analysis: ANALYSIS,
      ruleBased: RULE_BASED,
      projectName: 'demo',
      projectDescription: '',
      scanResult: SCAN,
      env: { ANTHROPIC_API_KEY: 'sk-fake' },
      fetchImpl,
    })
    // 白名单字段被覆盖
    expect(r.completion.projectPositioning).toBe('[llm] p')
    // 非白名单字段 coreValueTable 保持规则版
    expect(r.completion.coreValueTable).toBe('[rule] value table')
  })
})

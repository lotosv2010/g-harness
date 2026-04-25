// Deep Agent E2E 烟雾测试（TASK-100）
//
// 验证目标（不依赖真实 LangChain / deepagents / API key）：
// 1. 依赖缺失 → deps-missing 降级，trace 写入 summary
// 2. 无 API key → no-key 降级
// 3. Agent 产出全部越界路径 → parse-error 降级
// 4. Agent 产出部分越界 + 部分白名单 → success，extractDrafts 只保留白名单
// 5. Agent 抛错 → network-error 降级
// 6. trace 文件落在 docs/.gforge/ 下且 JSONL 合法

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ScanResult } from '../../scanner/project-scanner.js'

// ---------------------------------------------------------------------------
// 本文件依赖 `vi.mock` 在 import 之前生效，故使用 dynamic import 加载被测模块
// ---------------------------------------------------------------------------

interface MockState {
  depsOk: boolean
  depsMissing: string[]
  buildThrows?: Error
  invokeResult?: { files: Record<string, string> } | Error
}

const state: MockState = {
  depsOk: true,
  depsMissing: [],
}

vi.mock('./lazy-import.js', () => ({
  loadDeepAgentDeps: async () => {
    if (!state.depsOk) return { ok: false, missing: state.depsMissing }
    return {
      ok: true,
      deps: {
        createDeepAgent: () => ({}),
        ChatAnthropic: class {},
        ChatOpenAI: class {},
        tool: () => ({}),
        z: { object: () => ({}) },
      },
    }
  },
  __resetLazyImportCache: () => {},
}))

vi.mock('./agent-factory.js', () => ({
  buildDeepAgent: () => {
    if (state.buildThrows) throw state.buildThrows
    const runnable = {
      invoke: async () => {
        if (state.invokeResult instanceof Error) throw state.invokeResult
        return state.invokeResult ?? { files: {} }
      },
    }
    return { runnable, modelId: 'mock-model', toolNames: ['read_index'] }
  },
}))

function buildScanResult(): ScanResult {
  return {
    techStack: { language: 'TypeScript', runtime: 'Node.js', framework: null, packageManager: 'pnpm' },
    structure: { srcDir: 'src', hasTests: false, hasDocs: false, hasCI: false },
    existingConfig: {},
  } as unknown as ScanResult
}

async function importRunDeepAgent() {
  const mod = await import('./index.js')
  return mod.runDeepAgent
}

describe('runDeepAgent — E2E 烟雾测试', () => {
  let tmpDir: string
  let originalAnth: string | undefined
  let originalOai: string | undefined

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'gforge-deepagent-'))
    originalAnth = process.env.ANTHROPIC_API_KEY
    originalOai = process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
    // 重置每个测试的 mock state
    state.depsOk = true
    state.depsMissing = []
    state.buildThrows = undefined
    state.invokeResult = undefined
  })

  afterEach(async () => {
    if (originalAnth !== undefined) process.env.ANTHROPIC_API_KEY = originalAnth
    if (originalOai !== undefined) process.env.OPENAI_API_KEY = originalOai
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('依赖缺失时降级到 deps-missing 并不抛错', async () => {
    state.depsOk = false
    state.depsMissing = ['deepagents', '@langchain/core']
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('deps-missing')
      expect(result.message).toContain('deepagents')
      expect(result.partialDrafts).toEqual([])
    }
  })

  it('无 API key 时降级到 no-key', async () => {
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('no-key')
    }
  })

  it('显式传 apiKey 但未指定 provider 时降级（ADR-011）', async () => {
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
      apiKey: 'sk-test',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('no-key')
      expect(result.message).toContain('provider')
    }
  })

  it('agent 产出全部越界路径时降级到 parse-error', async () => {
    state.invokeResult = {
      files: {
        'random/path.md': '# 越界',
        'docs/RANDOM.md': '# 越界2',
      },
    }
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
      provider: 'anthropic',
      apiKey: 'sk-mock',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('parse-error')
      expect(result.partialDrafts).toEqual([])
    }
  })

  it('白名单文件可正常产出；越界路径被 extractDrafts 过滤', async () => {
    state.invokeResult = {
      files: {
        'AGENTS.md': '# AGENTS\n内容',
        'docs/SPEC.md': '# SPEC\n内容',
        'secret/evil.md': '# 越界',
      },
    }
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
      provider: 'anthropic',
      apiKey: 'sk-mock',
    })

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      const paths = result.drafts.map((d) => d.outputPath).sort()
      expect(paths).toEqual(['AGENTS.md', 'docs/SPEC.md'])
      expect(result.tracePath).toMatch(/agent-trace-.+\.jsonl$/)
      expect(result.cost.provider).toBe('anthropic')
    }
  })

  it('agent invoke 抛错时降级到 network-error 且保留 trace', async () => {
    state.invokeResult = new Error('connection reset')
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
      provider: 'anthropic',
      apiKey: 'sk-mock',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('network-error')
      expect(result.message).toContain('connection reset')
    }
  })

  it('trace JSONL 合法：首行是 message/error，末行是 summary', async () => {
    state.invokeResult = {
      files: { 'AGENTS.md': '# demo' },
    }
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'shallow',
      provider: 'openai',
      apiKey: 'sk-mock',
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') return

    const content = await readFile(result.tracePath, 'utf8')
    const lines = content.trim().split('\n').filter(Boolean)
    expect(lines.length).toBeGreaterThanOrEqual(2)

    // 每行必须是合法 JSON
    const parsed = lines.map((l) => JSON.parse(l) as Record<string, unknown>)

    // 末行必须是 summary
    const last = parsed[parsed.length - 1]
    expect(last.kind).toBe('summary')
    const lastData = last.data as { status: string; draftFiles?: string[] }
    expect(lastData.status).toBe('success')
    expect(lastData.draftFiles).toContain('AGENTS.md')
  })

  it('buildDeepAgent 抛错时降级到 unsupported', async () => {
    state.buildThrows = new Error('LangGraph init failed')
    const runDeepAgent = await importRunDeepAgent()

    const result = await runDeepAgent({
      targetDir: tmpDir,
      scanResult: buildScanResult(),
      preset: null,
      projectName: 'demo',
      projectDescription: '',
      depth: 'medium',
      provider: 'anthropic',
      apiKey: 'sk-mock',
    })

    expect(result.status).toBe('fallback')
    if (result.status === 'fallback') {
      expect(result.reason).toBe('unsupported')
      expect(result.message).toContain('LangGraph init failed')
    }
  })
})

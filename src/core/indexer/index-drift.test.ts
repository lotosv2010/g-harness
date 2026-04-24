import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectIndexDrift } from './index-drift.js'
import { renderProjectMap, renderFeatures, renderRoutes } from './index-writer.js'
import type { ProjectIndex } from './types.js'

let rootDir: string
let docsDir: string

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'index-drift-'))
  docsDir = join(rootDir, 'docs')
  await mkdir(docsDir, { recursive: true })
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

function buildIndex(overrides: Partial<ProjectIndex> = {}): ProjectIndex {
  return {
    generatedAt: '2026-04-24T00:00:00Z',
    rootDir,
    modules: [],
    routes: [],
    features: [],
    ...overrides,
  }
}

describe('detectIndexDrift', () => {
  it('无索引文件 → hasIndex=false', async () => {
    const fresh = buildIndex()
    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    expect(r.hasIndex).toBe(false)
    expect(r.items).toEqual([])
  })

  it('新增模块未同步 → 报告 added', async () => {
    const old = buildIndex()
    await writeFile(join(docsDir, 'PROJECT_MAP.md'), renderProjectMap(old))

    const fresh = buildIndex({
      modules: [
        { name: 'auth', kind: 'feature', path: 'src/auth', exports: [], files: ['5 files'] },
      ],
    })
    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    expect(r.hasIndex).toBe(true)
    expect(r.totals.added).toBe(1)
    expect(r.items[0].kind).toBe('module')
    expect(r.items[0].type).toBe('added')
  })

  it('索引中的模块已删除 → 报告 removed', async () => {
    const old = buildIndex({
      modules: [
        { name: 'legacy', kind: 'unknown', path: 'src/legacy', exports: [], files: ['3 files'] },
      ],
    })
    await writeFile(join(docsDir, 'PROJECT_MAP.md'), renderProjectMap(old))

    const fresh = buildIndex()
    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    expect(r.totals.removed).toBe(1)
    expect(r.items[0].type).toBe('removed')
    expect(r.items[0].description).toContain('legacy')
  })

  it('新增路由未同步 → 报告 route added', async () => {
    const old = buildIndex()
    await writeFile(join(docsDir, 'ROUTES.md'), renderRoutes(old))

    const fresh = buildIndex({
      routes: [
        {
          path: '/api/users',
          method: 'GET',
          file: 'src/api/users.ts',
          framework: 'express',
        },
      ],
    })
    // 触发 hasIndex = true
    await writeFile(join(docsDir, 'PROJECT_MAP.md'), renderProjectMap(buildIndex()))
    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    const routeAdds = r.items.filter((i) => i.kind === 'route' && i.type === 'added')
    expect(routeAdds.length).toBe(1)
    expect(routeAdds[0].description).toContain('/api/users')
  })

  it('索引引用的文件已删除 → 报告 dangling', async () => {
    const old = buildIndex({
      features: [
        { name: 'ghost', entry: 'src/ghost/index.ts', relatedFiles: [], status: 'active' },
      ],
    })
    await writeFile(join(docsDir, 'FEATURES.md'), renderFeatures(old))

    // fresh 仍含该 feature（仅文件不存在）
    const fresh = buildIndex({
      features: [
        { name: 'ghost', entry: 'src/ghost/index.ts', relatedFiles: [], status: 'active' },
      ],
    })
    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    expect(r.totals.dangling).toBeGreaterThanOrEqual(1)
    expect(r.items.some((i) => i.type === 'dangling' && i.kind === 'feature')).toBe(true)
  })

  it('索引与代码完全一致 → 无漂移', async () => {
    const fresh = buildIndex({
      modules: [
        { name: 'auth', kind: 'feature', path: 'src/auth', exports: [], files: ['5 files'] },
      ],
    })
    // 写入与 fresh 一致的索引
    await writeFile(join(docsDir, 'PROJECT_MAP.md'), renderProjectMap(fresh))
    await writeFile(join(docsDir, 'FEATURES.md'), renderFeatures(fresh))
    await writeFile(join(docsDir, 'ROUTES.md'), renderRoutes(fresh))

    const r = await detectIndexDrift(rootDir, docsDir, fresh)
    expect(r.hasIndex).toBe(true)
    expect(r.items).toEqual([])
  })
})

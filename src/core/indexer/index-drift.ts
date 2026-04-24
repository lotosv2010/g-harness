// 索引漂移检测 — 对比已有 PROJECT_MAP/FEATURES/ROUTES 与新扫描索引，报告差异

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from '../fs-utils.js'
import type { ProjectIndex } from './types.js'

export interface DriftItem {
  kind: 'module' | 'feature' | 'route'
  type: 'added' | 'removed' | 'dangling'
  /** 人类可读描述 */
  description: string
  /** 关联的路径或文件 */
  target?: string
}

export interface DriftReport {
  hasIndex: boolean
  totals: {
    added: number
    removed: number
    dangling: number
  }
  items: DriftItem[]
}

/**
 * 检测索引与代码实际状态的漂移。
 *
 * - added：新索引中存在但旧索引未收录（代码已新增，索引未刷新）
 * - removed：旧索引中存在但新索引已无（代码已删除，索引仍引用）
 * - dangling：索引中 file 路径对应文件已不存在
 */
export async function detectIndexDrift(
  rootDir: string,
  docsDir: string,
  fresh: ProjectIndex,
): Promise<DriftReport> {
  const mapPath = join(docsDir, 'PROJECT_MAP.md')
  const featuresPath = join(docsDir, 'FEATURES.md')
  const routesPath = join(docsDir, 'ROUTES.md')

  const hasIndex =
    (await fileExists(mapPath)) ||
    (await fileExists(featuresPath)) ||
    (await fileExists(routesPath))

  if (!hasIndex) {
    return { hasIndex: false, totals: { added: 0, removed: 0, dangling: 0 }, items: [] }
  }

  const items: DriftItem[] = []

  // ── 模块对比 ──
  const storedModules = (await fileExists(mapPath))
    ? parseModuleTable(await readFile(mapPath, 'utf-8'))
    : []
  const freshModules = new Set(fresh.modules.map((m) => m.name))
  const storedModuleSet = new Set(storedModules.map((m) => m.name))

  for (const m of fresh.modules) {
    if (!storedModuleSet.has(m.name)) {
      items.push({
        kind: 'module',
        type: 'added',
        description: `模块 ${m.name} 已新增但未写入 PROJECT_MAP`,
        target: m.path,
      })
    }
  }
  for (const m of storedModules) {
    if (!freshModules.has(m.name)) {
      items.push({
        kind: 'module',
        type: 'removed',
        description: `PROJECT_MAP 引用的模块 ${m.name} 已不存在`,
        target: m.path,
      })
    }
  }

  // ── 功能对比 ──
  const storedFeatures = (await fileExists(featuresPath))
    ? parseFeatureTable(await readFile(featuresPath, 'utf-8'))
    : []
  const freshFeatures = new Set(fresh.features.map((f) => f.name))
  const storedFeatureSet = new Set(storedFeatures.map((f) => f.name))

  for (const f of fresh.features) {
    if (!storedFeatureSet.has(f.name)) {
      items.push({
        kind: 'feature',
        type: 'added',
        description: `功能 ${f.name} 已新增但未写入 FEATURES`,
        target: f.entry,
      })
    }
  }
  for (const f of storedFeatures) {
    if (!freshFeatures.has(f.name)) {
      items.push({
        kind: 'feature',
        type: 'removed',
        description: `FEATURES 引用的功能 ${f.name} 已不存在`,
        target: f.entry,
      })
    }
    if (f.entry && !(await fileExists(join(rootDir, f.entry)))) {
      items.push({
        kind: 'feature',
        type: 'dangling',
        description: `FEATURES 引用的入口文件已不存在：${f.entry}`,
        target: f.entry,
      })
    }
  }

  // ── 路由对比 ──
  const storedRoutes = (await fileExists(routesPath))
    ? parseRouteTable(await readFile(routesPath, 'utf-8'))
    : []
  const freshRouteKey = new Set(fresh.routes.map(routeKey))
  const storedRouteKey = new Set(storedRoutes.map(routeKey))

  for (const r of fresh.routes) {
    if (!storedRouteKey.has(routeKey(r))) {
      items.push({
        kind: 'route',
        type: 'added',
        description: `路由 ${r.method ?? ''} ${r.path} 已新增但未写入 ROUTES`,
        target: r.file,
      })
    }
  }
  for (const r of storedRoutes) {
    if (!freshRouteKey.has(routeKey(r))) {
      items.push({
        kind: 'route',
        type: 'removed',
        description: `ROUTES 引用的路由 ${r.method ?? ''} ${r.path} 已不存在`,
        target: r.file,
      })
    }
    if (r.file && !(await fileExists(join(rootDir, r.file)))) {
      items.push({
        kind: 'route',
        type: 'dangling',
        description: `ROUTES 引用的 handler 文件已不存在：${r.file}`,
        target: r.file,
      })
    }
  }

  const totals = {
    added: items.filter((i) => i.type === 'added').length,
    removed: items.filter((i) => i.type === 'removed').length,
    dangling: items.filter((i) => i.type === 'dangling').length,
  }

  return { hasIndex: true, totals, items }
}

// ── 解析器 ──
// 注意：仅解析由 index-writer 生成的表格。自定义内容会被忽略。

interface StoredModule {
  name: string
  path: string
}

interface StoredFeature {
  name: string
  entry: string
}

interface StoredRoute {
  path: string
  method?: string
  file: string
}

function parseModuleTable(content: string): StoredModule[] {
  const rows: StoredModule[] = []
  const lines = content.split(/\r?\n/)
  let inTable = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('|') && line.includes('模块') && line.includes('类型')) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith('|---')) continue
    if (inTable && !line.startsWith('|')) {
      inTable = false
      continue
    }
    if (inTable && line.startsWith('|')) {
      const cells = splitRow(line)
      if (cells.length < 3) continue
      const name = cells[0]
      const path = stripBackticks(cells[2])
      if (name && path) rows.push({ name, path })
    }
  }
  return rows
}

function parseFeatureTable(content: string): StoredFeature[] {
  const rows: StoredFeature[] = []
  const lines = content.split(/\r?\n/)
  let inTable = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('|') && line.includes('功能') && line.includes('入口')) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith('|---')) continue
    if (inTable && !line.startsWith('|')) {
      inTable = false
      continue
    }
    if (inTable && line.startsWith('|')) {
      const cells = splitRow(line)
      if (cells.length < 2) continue
      const name = cells[0]
      const entry = stripBackticks(cells[1])
      if (name && entry) rows.push({ name, entry })
    }
  }
  return rows
}

function parseRouteTable(content: string): StoredRoute[] {
  const rows: StoredRoute[] = []
  const lines = content.split(/\r?\n/)
  let inTable = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('|') && line.includes('路径') && line.includes('方法')) {
      inTable = true
      continue
    }
    if (inTable && line.startsWith('|---')) continue
    if (inTable && !line.startsWith('|')) {
      inTable = false
      continue
    }
    if (inTable && line.startsWith('|')) {
      const cells = splitRow(line)
      if (cells.length < 4) continue
      const path = stripBackticks(cells[0])
      const method = cells[1] === '—' ? undefined : cells[1]
      // 第 4 列可能是 `file.ts:12` 或 `file.ts`
      const fileCell = stripBackticks(cells[3])
      const file = fileCell.split(':')[0] ?? fileCell
      if (path && file) rows.push({ path, method, file })
    }
  }
  return rows
}

function splitRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // 去掉首尾空段
    .map((c) => c.trim())
}

function stripBackticks(s: string): string {
  return s.replace(/^`+|`+$/g, '').trim()
}

function routeKey(r: { path: string; method?: string }): string {
  return `${r.method ?? ''}:${r.path}`
}

// 索引写入器 — 将 ProjectIndex 序列化为 PROJECT_MAP/FEATURES/ROUTES 三个 Markdown 文件

import type { ProjectIndex, RouteEntry, ModuleEntry, FeatureEntry } from './types.js'

export function renderProjectMap(index: ProjectIndex): string {
  const lines: string[] = []
  lines.push('# 项目地图（PROJECT_MAP）')
  lines.push('')
  lines.push('> 由 `g-harness index` 自动生成。AI 在改动前应优先阅读本文件，避免整体扫描源码。')
  lines.push(`> 生成时间：${index.generatedAt}`)
  lines.push('')
  lines.push('## 模块清单')
  lines.push('')
  lines.push('| 模块 | 类型 | 路径 | 入口 | 导出 | 规模 |')
  lines.push('|------|------|------|------|------|------|')

  const sorted = [...index.modules].sort((a, b) => a.name.localeCompare(b.name))
  for (const m of sorted) {
    const exportList = m.exports.length > 0 ? m.exports.slice(0, 5).join(', ') : '—'
    const entry = m.entry ? '`' + m.entry + '`' : '—'
    const files = m.files.join(' / ')
    lines.push(`| ${m.name} | ${m.kind} | \`${m.path}\` | ${entry} | ${exportList} | ${files} |`)
  }

  lines.push('')
  lines.push('## 使用指南')
  lines.push('')
  lines.push('- 修改某个模块前：先读该模块的入口文件（`index.ts`）了解公共 API')
  lines.push('- 新增模块：遵循 ARCHITECTURE.md 模块划分约束，更新本索引')
  lines.push('- 索引过期：运行 `g-harness index` 重新生成')
  lines.push('')
  return lines.join('\n')
}

export function renderFeatures(index: ProjectIndex): string {
  const lines: string[] = []
  lines.push('# 功能清单（FEATURES）')
  lines.push('')
  lines.push('> 由 `g-harness index` 自动生成。功能名 → 入口 + 相关文件的映射，便于 AI 快速定位。')
  lines.push(`> 生成时间：${index.generatedAt}`)
  lines.push('')
  lines.push('| 功能 | 入口 | 相关文件 | 状态 |')
  lines.push('|------|------|----------|------|')

  const sorted = [...index.features].sort((a, b) => a.name.localeCompare(b.name))
  for (const f of sorted) {
    const related = f.relatedFiles.slice(0, 5).map((x) => '`' + x + '`').join('<br/>')
    lines.push(`| ${f.name} | \`${f.entry}\` | ${related || '—'} | ${f.status} |`)
  }

  lines.push('')
  lines.push('## 如何扩展')
  lines.push('')
  lines.push('- 新增功能：先更新 SPEC.md 的功能需求，再实现并运行 `g-harness index` 刷新')
  lines.push('- Bug 修复：在 FEATURES 中查找功能对应入口，缩小定位范围')
  lines.push('')
  return lines.join('\n')
}

export function renderRoutes(index: ProjectIndex): string {
  const lines: string[] = []
  lines.push('# 路由表（ROUTES）')
  lines.push('')
  lines.push('> 由 `g-harness index` 自动生成。路径 → handler 文件的映射。')
  lines.push(`> 生成时间：${index.generatedAt}`)
  lines.push('')

  if (index.routes.length === 0) {
    lines.push('_当前项目未检测到路由定义。_')
    lines.push('')
    return lines.join('\n')
  }

  const grouped = groupBy(index.routes, (r) => r.framework)
  for (const [framework, routes] of grouped) {
    lines.push(`## ${frameworkLabel(framework)}`)
    lines.push('')
    lines.push('| 路径 | 方法 | Handler | 文件 |')
    lines.push('|------|------|---------|------|')
    for (const r of routes) {
      const method = r.method ?? '—'
      const handler = r.handler ?? '—'
      const location = r.line ? `\`${r.file}:${r.line}\`` : `\`${r.file}\``
      lines.push(`| \`${r.path}\` | ${method} | ${handler} | ${location} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function frameworkLabel(fw: string): string {
  const map: Record<string, string> = {
    'next-app-router': 'Next.js App Router',
    'next-pages-router': 'Next.js Pages Router',
    'nuxt': 'Nuxt',
    'react-router': 'React Router',
    'vue-router': 'Vue Router',
    'express': 'Express / Hono / Fastify',
    'unknown': '其他',
  }
  return map[fw] ?? fw
}

function groupBy<T, K>(arr: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of arr) {
    const k = key(item)
    const list = map.get(k) ?? []
    list.push(item)
    map.set(k, list)
  }
  return map
}

export function _exportForTest(): { renderProjectMap: typeof renderProjectMap } {
  return { renderProjectMap }
}

// 避免未使用类型报错
export type _Check = [RouteEntry, ModuleEntry, FeatureEntry]

// 功能映射器 — 从模块与路由反推功能清单

import type { FeatureEntry, ModuleEntry, RouteEntry } from './types.js'

export function mapFeatures(
  modules: ModuleEntry[],
  routes: RouteEntry[],
): FeatureEntry[] {
  const features: FeatureEntry[] = []
  const seen = new Set<string>()

  // 以 feature/service/component 类模块为主，汇集同名路由作为相关文件
  for (const m of modules) {
    if (m.kind === 'util') continue
    if (seen.has(m.name)) continue
    seen.add(m.name)

    const related = routes
      .filter((r) => r.file.includes(`/${m.name}/`) || r.path.includes(`/${m.name}`))
      .map((r) => r.file)

    const entry = m.entry ?? m.path
    const relatedFiles = [...new Set([entry, ...related])].filter(Boolean) as string[]

    features.push({
      name: toFeatureName(m.name),
      entry,
      relatedFiles,
      status: 'active',
    })
  }

  // 对于未匹配到模块的路由分组，按首段归类
  const grouped = new Map<string, string[]>()
  for (const r of routes) {
    const first = r.path.split('/').filter(Boolean)[0] ?? 'root'
    if (seen.has(first)) continue
    const list = grouped.get(first) ?? []
    list.push(r.file)
    grouped.set(first, list)
  }
  for (const [name, files] of grouped) {
    if (features.some((f) => f.name.toLowerCase() === name.toLowerCase())) continue
    features.push({
      name: toFeatureName(name),
      entry: files[0],
      relatedFiles: [...new Set(files)],
      status: 'active',
    })
  }

  return features
}

function toFeatureName(raw: string): string {
  if (!raw) return 'root'
  // kebab-case / snake_case → Title Case
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
}

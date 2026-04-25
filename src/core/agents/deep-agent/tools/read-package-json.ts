// readPackageJson —— 读取并精简 package.json
// 避免把 lock 级细节灌给 Agent，只保留对规范生成有意义的字段

import { readFile } from 'node:fs/promises'
import { assertPathSafe } from './security.js'

export interface PackageJsonSummary {
  exists: boolean
  name?: string
  version?: string
  description?: string
  type?: 'module' | 'commonjs'
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  engines?: Record<string, string>
  workspaces?: string[] | { packages?: string[] }
  raw?: unknown
}

/**
 * 读取目标目录根 `package.json`。
 * 不存在 / 解析失败时返回 exists=false；不抛错。
 */
export async function readPackageJson(targetDir: string): Promise<PackageJsonSummary> {
  const abs = assertPathSafe('package.json', targetDir)
  try {
    const raw = await readFile(abs, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      exists: true,
      name: asString(parsed.name),
      version: asString(parsed.version),
      description: asString(parsed.description),
      type: parsed.type === 'module' || parsed.type === 'commonjs' ? parsed.type : undefined,
      scripts: asStringRecord(parsed.scripts),
      dependencies: asStringRecord(parsed.dependencies),
      devDependencies: asStringRecord(parsed.devDependencies),
      engines: asStringRecord(parsed.engines),
      workspaces: parsed.workspaces as PackageJsonSummary['workspaces'],
    }
  } catch {
    return { exists: false }
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asStringRecord(v: unknown): Record<string, string> | undefined {
  if (!v || typeof v !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string') out[k] = val
  }
  return out
}

/** 工具返回给 LLM 的摘要文本（避免 dump 全量 JSON） */
export function formatPackageJsonSummary(s: PackageJsonSummary): string {
  if (!s.exists) return '【未找到 package.json】请使用 listDir 探索项目类型。'
  const lines: string[] = []
  lines.push(`name: ${s.name ?? '(未命名)'}`)
  if (s.version) lines.push(`version: ${s.version}`)
  if (s.description) lines.push(`description: ${s.description}`)
  if (s.type) lines.push(`type: ${s.type}`)
  if (s.engines) lines.push(`engines: ${JSON.stringify(s.engines)}`)
  if (s.scripts) {
    const keys = Object.keys(s.scripts)
    lines.push(`scripts: ${keys.length > 0 ? keys.join(', ') : '(空)'}`)
  }
  if (s.dependencies) {
    lines.push(`dependencies(${Object.keys(s.dependencies).length}): ${Object.keys(s.dependencies).slice(0, 30).join(', ')}`)
  }
  if (s.devDependencies) {
    lines.push(`devDependencies(${Object.keys(s.devDependencies).length}): ${Object.keys(s.devDependencies).slice(0, 30).join(', ')}`)
  }
  if (s.workspaces) lines.push(`workspaces: ${JSON.stringify(s.workspaces)}`)
  return lines.join('\n')
}

export const READ_PACKAGE_JSON_DESCRIPTION =
  '读取项目根 package.json 并返回精简摘要（name/scripts/deps/engines/workspaces）。无参数。单项目必用以识别技术栈。'

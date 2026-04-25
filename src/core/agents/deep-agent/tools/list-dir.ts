// listDir —— 列目标目录下的一级条目，过滤黑名单
// 不递归，避免 token 爆炸；Agent 需要深入时逐层调用

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { assertPathSafe, PathAccessError } from './security.js'

export interface DirEntry {
  name: string
  type: 'file' | 'dir' | 'symlink' | 'other'
  size?: number
}

export interface ListDirResult {
  path: string
  exists: boolean
  entries: DirEntry[]
  truncated: boolean
  skipped: string[]
}

const HIDDEN_SKIP = new Set(['.git', '.next', '.nuxt', '.turbo', '.cache'])
const NOISE_SKIP = new Set(['node_modules', 'dist', 'coverage', 'out', 'build'])
const DEFAULT_MAX_ENTRIES = 200

/**
 * 列出相对路径 `relPath` 下的条目；非递归。
 * 路径必须在 targetDir 内，否则抛 PathAccessError。
 */
export async function listDir(
  relPath: string,
  targetDir: string,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): Promise<ListDirResult> {
  const abs = assertPathSafe(relPath || '.', targetDir)

  let dirents
  try {
    dirents = await readdir(abs, { withFileTypes: true })
  } catch {
    return { path: relPath, exists: false, entries: [], truncated: false, skipped: [] }
  }

  const entries: DirEntry[] = []
  const skipped: string[] = []

  for (const d of dirents) {
    if (HIDDEN_SKIP.has(d.name) || NOISE_SKIP.has(d.name)) {
      skipped.push(d.name)
      continue
    }
    if (entries.length >= maxEntries) break

    const type: DirEntry['type'] = d.isFile()
      ? 'file'
      : d.isDirectory()
        ? 'dir'
        : d.isSymbolicLink()
          ? 'symlink'
          : 'other'

    let size: number | undefined
    if (type === 'file') {
      try {
        const s = await stat(join(abs, d.name))
        size = s.size
      } catch {
        // 读不到 stat 不致命
      }
    }
    entries.push({ name: d.name, type, size })
  }

  return {
    path: relPath,
    exists: true,
    entries,
    truncated: dirents.length - skipped.length > entries.length,
    skipped,
  }
}

export function formatListDirResult(r: ListDirResult): string {
  if (!r.exists) return `【目录不存在】${r.path}`
  const lines: string[] = [`【${r.path || '.'}】${r.entries.length} 项${r.truncated ? '（已截断）' : ''}`]
  for (const e of r.entries) {
    const sizePart = e.size !== undefined ? ` (${e.size}B)` : ''
    lines.push(`  ${e.type === 'dir' ? '📁' : e.type === 'symlink' ? '🔗' : '📄'} ${e.name}${sizePart}`)
  }
  if (r.skipped.length > 0) lines.push(`  [skipped: ${r.skipped.join(', ')}]`)
  return lines.join('\n')
}

export const LIST_DIR_DESCRIPTION =
  '列出指定相对路径下的目录条目（非递归）。参数：{ path: string }。自动过滤 node_modules/.git/dist/coverage 等噪音。'

export { PathAccessError }

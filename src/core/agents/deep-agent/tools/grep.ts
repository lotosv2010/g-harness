// grep —— 纯 Node.js 实现的简易内容搜索，不依赖外部 ripgrep
// 递归扫描 targetDir，跳过黑名单目录；行级正则匹配

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { assertPathSafe, PathAccessError } from './security.js'

export interface GrepHit {
  path: string
  line: number
  text: string
}

export interface GrepResult {
  pattern: string
  hits: GrepHit[]
  truncated: boolean
  filesScanned: number
  skipped: string[]
}

export interface GrepOptions {
  /** 正则（字符串形式，默认大小写敏感；传 `(?i)` 前缀启用忽略大小写） */
  pattern: string
  /** 限制在子目录内搜索（相对 targetDir），默认全目录 */
  dir?: string
  /** 最大返回命中数 */
  maxHits?: number
  /** 匹配的文件扩展名白名单 */
  includeExt?: string[]
}

const DEFAULT_MAX_HITS = 100
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  'out',
  'build',
  '.cache',
])
const SKIP_FILE_PATTERNS = [/\.env(\..+)?$/i, /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /^id_rsa/i]
const DEFAULT_INCLUDE_EXT = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.md', '.mdx', '.json', '.yml', '.yaml',
  '.vue', '.svelte', '.py', '.go', '.rs', '.java', '.kt',
]
const MAX_FILE_BYTES = 256 * 1024

/**
 * 递归搜索文件内容。结果条数命中上限后 truncated=true。
 */
export async function grep(targetDir: string, options: GrepOptions): Promise<GrepResult> {
  const maxHits = Math.min(options.maxHits ?? DEFAULT_MAX_HITS, 500)
  const includeExt = new Set((options.includeExt ?? DEFAULT_INCLUDE_EXT).map((e) => e.toLowerCase()))

  let caseInsensitive = false
  let raw = options.pattern
  if (raw.startsWith('(?i)')) {
    caseInsensitive = true
    raw = raw.slice(4)
  }
  const re = new RegExp(raw, caseInsensitive ? 'i' : '')

  const rootRel = options.dir ?? '.'
  const rootAbs = assertPathSafe(rootRel, targetDir)

  const hits: GrepHit[] = []
  const skipped: string[] = []
  let filesScanned = 0
  let truncated = false

  async function walk(dirAbs: string): Promise<void> {
    if (truncated) return
    let dirents
    try {
      dirents = await readdir(dirAbs, { withFileTypes: true })
    } catch {
      return
    }
    for (const d of dirents) {
      if (truncated) return
      const abs = join(dirAbs, d.name)

      // 路径安全（含黑名单）；违规条目整体跳过
      try {
        assertPathSafe(relative(targetDir, abs), targetDir)
      } catch (e) {
        if (e instanceof PathAccessError) {
          skipped.push(d.name)
          continue
        }
        throw e
      }

      if (d.isDirectory()) {
        if (SKIP_DIRS.has(d.name) || d.name.startsWith('.git')) {
          skipped.push(d.name)
          continue
        }
        await walk(abs)
        continue
      }
      if (!d.isFile()) continue
      if (SKIP_FILE_PATTERNS.some((p) => p.test(d.name))) {
        skipped.push(d.name)
        continue
      }
      const ext = extOf(d.name)
      if (!includeExt.has(ext)) continue

      try {
        const s = await stat(abs)
        if (s.size > MAX_FILE_BYTES) continue
      } catch {
        continue
      }

      filesScanned++
      let content: string
      try {
        content = await readFile(abs, 'utf-8')
      } catch {
        continue
      }
      const lines = content.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          hits.push({
            path: relative(targetDir, abs).replace(/\\/g, '/'),
            line: i + 1,
            text: lines[i].slice(0, 300),
          })
          if (hits.length >= maxHits) {
            truncated = true
            return
          }
        }
      }
    }
  }

  await walk(rootAbs)

  return {
    pattern: options.pattern,
    hits,
    truncated,
    filesScanned,
    skipped,
  }
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

export function formatGrepResult(r: GrepResult): string {
  if (r.hits.length === 0) {
    return `【grep /${r.pattern}/】0 命中；扫描 ${r.filesScanned} 文件。`
  }
  const header = `【grep /${r.pattern}/】${r.hits.length} 命中（扫描 ${r.filesScanned} 文件${r.truncated ? '，已截断' : ''}）`
  const body = r.hits.map((h) => `  ${h.path}:${h.line}: ${h.text}`).join('\n')
  return `${header}\n${body}`
}

export const GREP_DESCRIPTION =
  '在项目内递归搜索正则/关键字。参数：{ pattern: string, dir?: string, maxHits?: number, includeExt?: string[] }。pattern 可用 `(?i)` 前缀启用忽略大小写。自动跳过 node_modules/.git/dist 等黑名单目录。'

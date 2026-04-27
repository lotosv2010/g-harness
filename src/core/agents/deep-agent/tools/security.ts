// Deep Agent 路径 / 内容安全校验

import { resolve, sep } from 'node:path'

const BLACKLIST_PATTERNS: RegExp[] = [
  /(^|[/\\])\.env($|[.\w-]*)/,
  /(^|[/\\])id_rsa/,
  /\.pem$/i,
  /\.key$/i,
  /(^|[/\\])\.git([/\\]|$)/,
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])coverage([/\\]|$)/,
  /(^|[/\\])\.next([/\\]|$)/,
  /(^|[/\\])\.turbo([/\\]|$)/,
]

export function normalizePath(p: string): string {
  return p.split(sep).join('/').replace(/\\+/g, '/')
}

export interface PathCheckResult {
  ok: boolean
  reason?: string
  resolvedPath?: string
}

/**
 * 路径必须落在 targetDir 内，且不命中黑名单。
 * 返回规范化后的绝对路径以供后续 IO 使用。
 */
export function assertPathSafe(inputPath: string, targetDir: string): PathCheckResult {
  const absTarget = resolve(targetDir)
  const abs = resolve(absTarget, inputPath)
  const nTarget = normalizePath(absTarget)
  const nPath = normalizePath(abs)
  if (!nPath.startsWith(nTarget + '/') && nPath !== nTarget) {
    return { ok: false, reason: `路径越界：${inputPath}` }
  }
  for (const pat of BLACKLIST_PATTERNS) {
    if (pat.test(nPath)) {
      return { ok: false, reason: `命中黑名单：${inputPath}` }
    }
  }
  return { ok: true, resolvedPath: abs }
}

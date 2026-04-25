// 工具安全层 —— 所有只读工具调用前必须走 assertPathSafe
//
// 防御矩阵：
// 1. 路径必须在 targetDir 内（防 `../` 穿越 + 符号链接逃逸）
// 2. 黑名单后缀/段：.env* / *.pem / id_rsa* / *.key / .git / node_modules / dist / coverage
// 3. 拒绝绝对路径以外的形式，调用方必须先 path.resolve
// 4. realpathSync 展开链接后重新校验（Symbolic link escape protection）

import { realpathSync } from 'node:fs'
import { resolve, relative, basename } from 'node:path'

const BLACKLIST_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.next',
  '.nuxt',
  '.turbo',
  'out',
])

const BLACKLIST_FILE_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa(\..+)?$/i,
  /^id_ed25519(\..+)?$/i,
  /\.(p12|pfx)$/i,
  /^\.npmrc$/i,
  /^\.yarnrc$/i,
]

export class PathAccessError extends Error {
  constructor(
    message: string,
    public readonly reason: 'escape' | 'blacklist' | 'invalid',
    public readonly attemptedPath: string,
  ) {
    super(message)
    this.name = 'PathAccessError'
  }
}

/**
 * 断言路径可安全访问。
 * 成功返回 resolved absolute path；失败抛 PathAccessError。
 */
export function assertPathSafe(inputPath: string, targetDir: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new PathAccessError('路径不可为空', 'invalid', String(inputPath))
  }

  const resolvedTarget = resolve(targetDir)
  const resolvedPath = resolve(resolvedTarget, inputPath)

  // 1. 黑名单段：遍历相对路径片段
  const rel = relative(resolvedTarget, resolvedPath)
  const segments = rel.split(/[/\\]/).filter(Boolean)
  for (const seg of segments) {
    if (BLACKLIST_SEGMENTS.has(seg)) {
      throw new PathAccessError(
        `路径包含黑名单目录：${seg}`,
        'blacklist',
        inputPath,
      )
    }
  }

  // 2. 文件名黑名单
  const filename = basename(resolvedPath)
  for (const pat of BLACKLIST_FILE_PATTERNS) {
    if (pat.test(filename)) {
      throw new PathAccessError(
        `文件名命中黑名单：${filename}`,
        'blacklist',
        inputPath,
      )
    }
  }

  // 3. 穿越检测（relative 以 .. 开头说明已逃出 targetDir）
  if (rel.startsWith('..') || rel === '..') {
    throw new PathAccessError(
      `路径逃逸出目标目录：${inputPath}`,
      'escape',
      inputPath,
    )
  }

  // 4. 展开符号链接再次校验
  let realResolved: string
  try {
    realResolved = realpathSync(resolvedPath)
  } catch {
    // 路径不存在也是合法情况（调用方会处理 ENOENT），返回 resolved path
    return resolvedPath
  }

  const realRel = relative(resolvedTarget, realResolved)
  if (realRel.startsWith('..') || realRel === '..') {
    throw new PathAccessError(
      `符号链接逃逸：${inputPath} → ${realResolved}`,
      'escape',
      inputPath,
    )
  }

  // 链接目标也要走黑名单
  const realSegments = realRel.split(/[/\\]/).filter(Boolean)
  for (const seg of realSegments) {
    if (BLACKLIST_SEGMENTS.has(seg)) {
      throw new PathAccessError(
        `链接目标包含黑名单目录：${seg}`,
        'blacklist',
        inputPath,
      )
    }
  }

  return realResolved
}

/** 判断路径是否安全（不抛错，返回布尔） */
export function isPathSafe(inputPath: string, targetDir: string): boolean {
  try {
    assertPathSafe(inputPath, targetDir)
    return true
  } catch {
    return false
  }
}

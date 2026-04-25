// readFile —— 读取单文件，硬限行数 + 路径白名单
// Agent 最常调用的工具，必须严格控 token + 禁敏感文件

import { readFile as fsReadFile, stat } from 'node:fs/promises'
import { assertPathSafe } from './security.js'

export interface ReadFileResult {
  path: string
  exists: boolean
  truncated: boolean
  totalLines: number
  startLine: number
  endLine: number
  size: number
  content: string
}

export interface ReadFileOptions {
  startLine?: number
  maxLines?: number
}

const ABS_MAX_LINES = 500
const ABS_MAX_BYTES = 256 * 1024 // 256 KB 硬上限，防 Agent 读大二进制

/**
 * 读取文件内容，支持从 startLine 开始读 maxLines 行。
 * 路径黑名单由 assertPathSafe 统一拦截。
 */
export async function readFile(
  relPath: string,
  targetDir: string,
  options: ReadFileOptions = {},
): Promise<ReadFileResult> {
  const abs = assertPathSafe(relPath, targetDir)
  const startLine = Math.max(1, options.startLine ?? 1)
  const maxLines = Math.min(options.maxLines ?? ABS_MAX_LINES, ABS_MAX_LINES)

  let size = 0
  try {
    const s = await stat(abs)
    size = s.size
    if (size > ABS_MAX_BYTES) {
      return {
        path: relPath,
        exists: true,
        truncated: true,
        totalLines: 0,
        startLine,
        endLine: startLine,
        size,
        content: `【文件过大 ${size}B 超过 ${ABS_MAX_BYTES}B 上限，已拒绝读取】请用 grep 聚焦关键字。`,
      }
    }
  } catch {
    return {
      path: relPath,
      exists: false,
      truncated: false,
      totalLines: 0,
      startLine,
      endLine: startLine,
      size: 0,
      content: '',
    }
  }

  const raw = await fsReadFile(abs, 'utf-8')
  const lines = raw.split(/\r?\n/)
  const totalLines = lines.length
  const sliceStart = startLine - 1
  const sliceEnd = Math.min(sliceStart + maxLines, totalLines)
  const slice = lines.slice(sliceStart, sliceEnd)
  const truncated = totalLines > sliceEnd || startLine > 1

  return {
    path: relPath,
    exists: true,
    truncated,
    totalLines,
    startLine,
    endLine: sliceEnd,
    size,
    content: slice.join('\n'),
  }
}

export function formatReadFileResult(r: ReadFileResult): string {
  if (!r.exists) return `【文件不存在】${r.path}`
  const header = r.truncated
    ? `【${r.path}】行 ${r.startLine}-${r.endLine} / 共 ${r.totalLines}（已截断）`
    : `【${r.path}】共 ${r.totalLines} 行`
  return `${header}\n\n${r.content}`
}

export const READ_FILE_DESCRIPTION =
  '读取文本文件内容。参数：{ path: string, startLine?: number, maxLines?: number }。单次最多 500 行 / 256KB；路径必须在项目内且不命中敏感黑名单。'

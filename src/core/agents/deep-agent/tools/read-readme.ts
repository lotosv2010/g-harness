// readReadme —— 读取根 README.md，硬限 250 行以控 token

import { readFile } from 'node:fs/promises'
import { assertPathSafe } from './security.js'

export interface ReadReadmeResult {
  exists: boolean
  truncated: boolean
  totalLines: number
  content: string
}

const DEFAULT_MAX_LINES = 250

/**
 * 读取目标目录根 README.md（或 README / readme.md）。
 * 超过 maxLines 时截断并标记 truncated。
 */
export async function readReadme(
  targetDir: string,
  maxLines: number = DEFAULT_MAX_LINES,
): Promise<ReadReadmeResult> {
  const candidates = ['README.md', 'readme.md', 'README']
  for (const rel of candidates) {
    const abs = assertPathSafe(rel, targetDir)
    try {
      const raw = await readFile(abs, 'utf-8')
      const lines = raw.split(/\r?\n/)
      const truncated = lines.length > maxLines
      const content = (truncated ? lines.slice(0, maxLines) : lines).join('\n')
      return { exists: true, truncated, totalLines: lines.length, content }
    } catch {
      // 继续尝试下一候选
    }
  }
  return { exists: false, truncated: false, totalLines: 0, content: '' }
}

export function formatReadmeResult(r: ReadReadmeResult): string {
  if (!r.exists) return '【未找到 README】'
  const hint = r.truncated ? `（已截断，共 ${r.totalLines} 行，仅展示前 ${r.content.split('\n').length} 行）` : ''
  return `【README】${hint}\n\n${r.content}`
}

export const READ_README_DESCRIPTION =
  '读取项目根 README.md，默认上限 250 行。无参数。用于理解项目定位、目标与用法。'

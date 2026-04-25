// readIndex —— 读取项目索引三件套（PROJECT_MAP / FEATURES / ROUTES）
// 来源：ADR-008 项目索引；Agent 浅层模式首选入口

import { readFile } from 'node:fs/promises'
import { assertPathSafe } from './security.js'

const INDEX_FILES = [
  'docs/PROJECT_MAP.md',
  'docs/FEATURES.md',
  'docs/ROUTES.md',
] as const

export interface ReadIndexResult {
  found: string[]
  missing: string[]
  content: string
}

/**
 * 读取并拼接项目索引文件。
 * 成功文件以 `## <path>` 分段；不存在的文件列入 missing。
 */
export async function readIndex(targetDir: string): Promise<ReadIndexResult> {
  const found: string[] = []
  const missing: string[] = []
  const parts: string[] = []

  for (const rel of INDEX_FILES) {
    const abs = assertPathSafe(rel, targetDir)
    try {
      const content = await readFile(abs, 'utf-8')
      found.push(rel)
      parts.push(`## ${rel}\n\n${content.trim()}`)
    } catch {
      missing.push(rel)
    }
  }

  return {
    found,
    missing,
    content: parts.join('\n\n---\n\n'),
  }
}

/** LLM 可读的摘要字符串 —— 工具返回给模型的最终文本 */
export function formatReadIndexResult(r: ReadIndexResult): string {
  if (r.found.length === 0) {
    return `【无可用索引】缺失：${r.missing.join(', ')}。请改用 readPackageJson/listDir 探索项目。`
  }
  return `【已读取索引】found=[${r.found.join(', ')}] missing=[${r.missing.join(', ')}]\n\n${r.content}`
}

export const READ_INDEX_DESCRIPTION =
  '读取项目索引文件（docs/PROJECT_MAP.md / FEATURES.md / ROUTES.md）。无参数。返回拼接后的索引内容及缺失文件清单。优先使用此工具建立项目全貌。'

// readIndex 工具：读 docs/PROJECT_MAP.md / FEATURES.md / ROUTES.md（索引快照）
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'

const INDEX_FILES = ['docs/PROJECT_MAP.md', 'docs/FEATURES.md', 'docs/ROUTES.md']

export function createReadIndexTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'readIndex',
    description: '读取项目索引文件（docs/PROJECT_MAP.md / FEATURES.md / ROUTES.md），返回已存在文件的全文',
    schema: z.object({}),
    handler: async () => {
      const chunks: string[] = []
      for (const rel of INDEX_FILES) {
        try {
          const content = await readFile(join(ctx.targetDir, rel), 'utf-8')
          chunks.push(`## ${rel}\n\n${content}`)
        } catch {
          // 缺失即跳过
        }
      }
      if (chunks.length === 0) return '（未发现索引文件；可改用 list_dir 与 read_file 抽样分析）'
      return chunks.join('\n\n---\n\n')
    },
  }
}

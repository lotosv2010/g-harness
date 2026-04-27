// readReadme 工具：读 README.md 前 250 行
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'

export function createReadReadmeTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'readReadme',
    description: '读取目标项目 README.md 的前 250 行；不存在则返回占位文本',
    schema: z.object({}),
    handler: async () => {
      for (const name of ['README.md', 'README.rst', 'README.txt']) {
        try {
          const raw = await readFile(join(ctx.targetDir, name), 'utf-8')
          const lines = raw.split(/\r?\n/).slice(0, 250)
          return lines.join('\n')
        } catch {
          // next
        }
      }
      return '（未找到 README）'
    },
  }
}

// readFile 工具：读单个文件，受 depth 行数上限约束
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile } from 'node:fs/promises'
import type { ToolContext, ToolSpec } from './types.js'
import { assertPathSafe } from './security.js'

export function createReadFileTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'readFile',
    description: '读取目标项目内的单个文件（路径必须在 targetDir 内且不在黑名单），受行数上限约束',
    schema: z.object({
      path: z.string().describe('相对 targetDir 的文件路径'),
    }),
    handler: async (input) => {
      const rel = typeof input.path === 'string' ? input.path : ''
      const check = assertPathSafe(rel, ctx.targetDir)
      if (!check.ok) return `ERROR: ${check.reason}`
      const abs = check.resolvedPath
      if (!abs) return 'ERROR: 路径解析失败'
      try {
        const raw = await readFile(abs, 'utf-8')
        const lines = raw.split(/\r?\n/)
        if (lines.length <= ctx.readFileLineLimit) return raw
        const truncated = lines.slice(0, ctx.readFileLineLimit).join('\n')
        return `${truncated}\n\n(已截断：原文 ${lines.length} 行，展示前 ${ctx.readFileLineLimit} 行)`
      } catch (err) {
        return `ERROR: ${(err as Error).message}`
      }
    },
  }
}

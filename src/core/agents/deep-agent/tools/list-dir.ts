// listDir 工具：列目录，过滤敏感与无关路径
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readdir } from 'node:fs/promises'
import type { ToolContext, ToolSpec } from './types.js'
import { assertPathSafe } from './security.js'

export function createListDirTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'listDir',
    description: '列出目标项目内某目录的第一层条目（过滤 node_modules / .git / dist / coverage / .env 等）',
    schema: z.object({
      path: z.string().describe('相对 targetDir 的目录路径，如 "src" 或 "."'),
    }),
    handler: async (input) => {
      const rel = typeof input.path === 'string' ? input.path : '.'
      const check = assertPathSafe(rel, ctx.targetDir)
      if (!check.ok) return `ERROR: ${check.reason}`
      const startDir = check.resolvedPath
      if (!startDir) return 'ERROR: 路径解析失败'
      try {
        const entries = await readdir(startDir, { withFileTypes: true })
        const filtered = entries
          .filter((e) => !shouldHide(e.name))
          .map((e) => (e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`))
        return filtered.length === 0 ? '（空目录或全部被过滤）' : filtered.join('\n')
      } catch (err) {
        return `ERROR: ${(err as Error).message}`
      }
    },
  }
}

function shouldHide(name: string): boolean {
  return (
    name.startsWith('.env') ||
    name === 'node_modules' ||
    name === '.git' ||
    name === 'dist' ||
    name === 'coverage' ||
    name === '.next' ||
    name === '.turbo'
  )
}

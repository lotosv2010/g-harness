// grep 工具：纯 JS 实现（不依赖 rg），递归搜索符合 glob 的文件
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'
import { assertPathSafe } from './security.js'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.turbo'])

export function createGrepTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'grep',
    description: '递归搜索目标项目的文本匹配（过滤 node_modules/.git/dist），返回 path:line:preview，总条数上限由 depth 决定',
    schema: z.object({
      pattern: z.string().describe('文本匹配模式（普通字符串，非正则；大小写敏感）'),
      rootPath: z.string().optional().describe('起始目录（默认 "."）'),
      extension: z.string().optional().describe('仅匹配该后缀文件（如 ".ts"），默认任意'),
    }),
    handler: async (input) => {
      const pattern = typeof input.pattern === 'string' ? input.pattern : ''
      if (!pattern) return 'ERROR: pattern 不可为空'
      const rel = typeof input.rootPath === 'string' ? input.rootPath : '.'
      const ext = typeof input.extension === 'string' ? input.extension : ''
      const check = assertPathSafe(rel, ctx.targetDir)
      if (!check.ok) return `ERROR: ${check.reason}`
      const results: string[] = []
      const startDir = check.resolvedPath
      if (!startDir) return 'ERROR: 路径解析失败'
      try {
        await walk(startDir, ctx.targetDir, pattern, ext, results, ctx.grepResultLimit)
      } catch (err) {
        return `ERROR: ${(err as Error).message}`
      }
      if (results.length === 0) return '（无匹配）'
      return results.join('\n')
    },
  }
}

async function walk(
  dir: string,
  root: string,
  pattern: string,
  ext: string,
  out: string[],
  limit: number,
): Promise<void> {
  if (out.length >= limit) return
  let entries: { name: string; isDirectory: () => boolean; isFile: () => boolean }[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (out.length >= limit) return
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.name.startsWith('.env')) continue
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(abs, root, pattern, ext, out, limit)
      continue
    }
    if (!entry.isFile()) continue
    if (ext && !entry.name.endsWith(ext)) continue
    try {
      const info = await stat(abs)
      if (info.size > 2 * 1024 * 1024) continue
      const raw = await readFile(abs, 'utf-8')
      const lines = raw.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (out.length >= limit) return
        if (lines[i].includes(pattern)) {
          const relPath = relative(root, abs).split(/\\+/).join('/')
          out.push(`${relPath}:${i + 1}: ${lines[i].slice(0, 200)}`)
        }
      }
    } catch {
      // skip
    }
  }
}

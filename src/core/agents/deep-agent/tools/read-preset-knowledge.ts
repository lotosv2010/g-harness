// readPresetKnowledge：读预设内置知识库（位于 harnessRoot/src/core/agents/deep-agent/knowledge/）

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'
import type { ZodLike } from '../langchain-shims.js'

export function createReadPresetKnowledgeTool(ctx: ToolContext, z: ZodLike): ToolSpec {
  return {
    name: 'readPresetKnowledge',
    description: '读取内置预设知识库（最佳实践、陷阱、分层建议），缺失则返回提示而非报错',
    schema: z.object({
      slug: z
        .string()
        .describe('预设 slug，例如 "vite-react" / "nextjs" / "nuxt" / "nestjs" / "electron" / "fastapi"'),
    }),
    handler: async (input) => {
      const slug = typeof input.slug === 'string' ? input.slug : ''
      if (!slug) return 'ERROR: slug 不可为空'
      const safe = slug.replace(/[^a-z0-9_-]/gi, '')
      const path = join(ctx.harnessRoot, 'src', 'core', 'agents', 'deep-agent', 'knowledge', `${safe}.md`)
      try {
        return await readFile(path, 'utf-8')
      } catch {
        return `（未提供 "${safe}" 的知识库，请基于通用工程经验做判断）`
      }
    },
  }
}

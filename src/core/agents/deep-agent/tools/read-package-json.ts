// readPackageJson 工具：读根 package.json，返回 name/description/scripts/deps 摘要
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'

export function createReadPackageJsonTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'readPackageJson',
    description: '读取目标项目的 package.json 摘要（name / description / scripts / dependencies 列表）',
    schema: z.object({}),
    handler: async () => {
      try {
        const raw = await readFile(join(ctx.targetDir, 'package.json'), 'utf-8')
        const pkg = JSON.parse(raw) as Record<string, unknown>
        const summary = {
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          scripts: pkg.scripts,
          dependencies: Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
          devDependencies: Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
        }
        return JSON.stringify(summary, null, 2)
      } catch {
        return '（未找到 package.json）'
      }
    },
  }
}

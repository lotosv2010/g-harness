// Deep Agent 工具集装配（按 depth 过滤）
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Depth } from '../types.js'
import type { ToolContext, ToolSpec } from './types.js'
import { createReadIndexTool } from './read-index.js'
import { createReadPackageJsonTool } from './read-package-json.js'
import { createReadReadmeTool } from './read-readme.js'
import { createListDirTool } from './list-dir.js'
import { createReadFileTool } from './read-file.js'
import { createGrepTool } from './grep.js'
import { createReadPresetKnowledgeTool } from './read-preset-knowledge.js'
import { createAskUserTool } from './ask-user.js'

export type { ToolContext, ToolSpec } from './types.js'

/** 基于 depth 构建 ToolSpec 集合（尚未用 deepagents.tool() 包装） */
export function buildToolSpecs(depth: Depth, ctx: ToolContext, z: any, enableAskUser: boolean): ToolSpec[] {
  const specs: ToolSpec[] = [
    createReadIndexTool(ctx, z),
    createReadPackageJsonTool(ctx, z),
    createReadReadmeTool(ctx, z),
    createReadPresetKnowledgeTool(ctx, z),
  ]
  if (depth !== 'shallow') {
    specs.push(createListDirTool(ctx, z))
    specs.push(createReadFileTool(ctx, z))
  }
  if (depth === 'deep') {
    specs.push(createGrepTool(ctx, z))
  }
  if (enableAskUser && ctx.askUserRemaining > 0) {
    specs.push(createAskUserTool(ctx, z))
  }
  return specs
}

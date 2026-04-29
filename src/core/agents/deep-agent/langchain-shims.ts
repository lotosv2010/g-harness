// LangChain / deepagents 的最小类型 shim。
//
// 背景：
// - deepagents / @langchain/* 是 optionalDependencies，g-harness 主流程不依赖它们
// - 这些包的类型定义版本漂移严重且 runtime 可能不存在，直接 import 类型会污染构建
// - lazy-import.ts 以 `unknown` 形式加载；本文件集中声明 runtime 所需的最小形状
//
// 使用约定：
// - 本文件是 `any` 出逃的唯一合法集中地（文件级 eslint-disable 仅此一处）
// - 其他模块应从这里导入 shim 类型，而不是各自 `as any`
/* eslint-disable @typescript-eslint/no-explicit-any */

/** LangChain Chat 模型构造器（各 provider 均实现该形状） */
export type ChatModelCtor = new (cfg: Record<string, unknown>) => unknown

/** `@langchain/core/tools` 的 `tool()` 工厂 */
export type ToolFactory = (
  handler: (args: any) => unknown | Promise<unknown>,
  opts: { name: string; description: string; schema: unknown },
) => unknown

/** `deepagents` 的 `createDeepAgent()` 返回可调用图（具 stream / invoke） */
export interface DeepAgentGraph {
  stream(
    payload: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<AsyncIterable<unknown>>
  invoke?(
    payload: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<unknown>
}

export type DeepAgentFactory = (cfg: {
  model: unknown
  tools: unknown[]
  systemPrompt: string
  subagents?: Array<{ name: string; description: string; systemPrompt: string }>
}) => DeepAgentGraph

/** 把未知类型收敛为指定 shim，局部使用（避免全文件 eslint-disable） */
export function asChatModelCtor(v: unknown): ChatModelCtor {
  return v as ChatModelCtor
}

export function asToolFactory(v: unknown): ToolFactory {
  return v as ToolFactory
}

export function asDeepAgentFactory(v: unknown): DeepAgentFactory {
  return v as DeepAgentFactory
}

export function asDeepAgentGraph(v: unknown): DeepAgentGraph {
  return v as DeepAgentGraph
}

/**
 * `zod` 的 `z` 命名空间别名。
 * zod 是 optional dep，lazy-import 以 `unknown` 形式拿到运行时对象；
 * 其链式 API 返回值形态复杂且版本间漂移，这里用 callable bag 简化：
 * - 调用签名接受任意参数、返回 `ZodSchema`
 * - ZodSchema 支持任意链式方法，返回值也是 `ZodSchema`
 * 这是 shim 与 runtime 现实之间的必要妥协，但仅限本文件。
 */
export interface ZodSchema {
  [key: string]: (...args: unknown[]) => ZodSchema
}

export type ZodLike = {
  [key: string]: (...args: unknown[]) => ZodSchema
}

export function asZod(v: unknown): ZodLike {
  return v as ZodLike
}

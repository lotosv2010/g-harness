// 工具定义接口（v0.2.0）
//
// 每个工具文件导出一个 createXxxTool() 工厂，返回统一形状 ToolSpec，
// 便于 agent-factory.ts 在运行时用 deepagents 的 tool() 包一层 zod schema。

import type { Depth } from '../types.js'

export interface ToolContext {
  targetDir: string
  harnessRoot: string
  depth: Depth
  readFileLineLimit: number
  grepResultLimit: number
  /** 当 Agent 选择 askUser 时回调，可能抛错表示用户终止 */
  askUser?: (question: string) => Promise<string | null>
  /** 已累积的 askUser 次数与上限 */
  askUserRemaining: number
}

export interface ToolSpec {
  name: string
  description: string
  /** zod schema 对象（由工厂创建时传入 z 引用） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any
  /** 同步或异步处理函数 */
  handler: (input: Record<string, unknown>) => Promise<string>
}

// askUser：Human-in-the-loop 提问（仅在 enableAskUser 且次数未耗尽时可用）

import type { ToolContext, ToolSpec } from './types.js'
import type { ZodLike } from '../langchain-shims.js'

export function createAskUserTool(ctx: ToolContext, z: ZodLike): ToolSpec {
  return {
    name: 'askUser',
    description: '向用户提问以获取决策输入；受 depth 上限约束，超限或非交互模式下自动拒绝',
    schema: z.object({
      question: z.string().describe('向用户提出的问题；尽量具体且一次只问一个选择'),
    }),
    handler: async (input) => {
      if (!ctx.askUser) return 'ERROR: 当前运行模式下 askUser 不可用'
      if (ctx.askUserRemaining <= 0) return 'ERROR: askUser 次数已用尽'
      const question = typeof input.question === 'string' ? input.question : ''
      if (!question.trim()) return 'ERROR: question 不可为空'
      const answer = await ctx.askUser(question)
      ctx.askUserRemaining -= 1
      return answer ?? '（用户未回答）'
    },
  }
}

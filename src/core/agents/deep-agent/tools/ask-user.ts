// askUser —— Human-in-the-loop 询问工具（可选）
//
// 设计要点：
// - 仅中/深层 agent 启用；shallow 强制禁用（ADR-010 askUserLimit[shallow]=0）
// - 单次会话问题数硬上限（默认由 depth profile 提供：medium=2, deep=3）
// - 非交互模式（!process.stdin.isTTY）下自动返回 "[非交互模式，问题被跳过]"
// - 通过 @clack/prompts text 与主流程共享 stdin
// - 超出问题数直接返回拒绝字符串，不抛错（LLM 能看懂并继续）

import * as p from '@clack/prompts'

export interface AskUserOptions {
  /** 本次会话累计问题数上限；0 表示禁用 */
  maxQuestions: number
  /** 是否处于 TTY / 交互环境 */
  interactive: boolean
  /** 每题超时（毫秒），默认 60s */
  timeoutMs?: number
}

export interface AskUserState {
  asked: number
}

export const ASK_USER_DESCRIPTION = `向用户提问（仅在非常必要时使用）。
输入：question（问题，≤200 字符）
返回：用户的文字回答；若无法询问（非交互 / 超限 / 已禁用）返回带前缀的拒绝字符串
使用纪律：
- 只在存在二义性且无法从代码/文档推断时才用
- 单次会话硬上限问题数（shallow 禁用；medium 最多 2；deep 最多 3）
- 问题必须具体、可快速回答；不要问开放式"你想要什么"`

/** 创建一个绑定了状态的 askUser 执行器 */
export function createAskUser(opts: AskUserOptions): (args: { question: string }) => Promise<string> {
  const state: AskUserState = { asked: 0 }
  return async (args) => {
    const question = String(args?.question ?? '').trim()
    if (!question) return '[askUser 拒绝] 空问题'

    if (opts.maxQuestions <= 0) return '[askUser 拒绝] 该深度档位已禁用提问'
    if (!opts.interactive) return '[askUser 拒绝] 非交互模式，问题被跳过'
    if (state.asked >= opts.maxQuestions) {
      return `[askUser 拒绝] 本次会话提问上限 ${opts.maxQuestions} 已达，请基于现有信息作答`
    }

    state.asked += 1
    const trimmed = question.length > 200 ? question.slice(0, 200) + '…' : question

    try {
      const answer = await p.text({
        message: `[Agent 提问 ${state.asked}/${opts.maxQuestions}] ${trimmed}`,
        placeholder: '（回车跳过）',
      })
      if (p.isCancel(answer)) return '[askUser 拒绝] 用户取消输入'
      const text = String(answer).trim()
      if (!text) return '[askUser 空答] 用户未输入，请基于现有信息判断'
      return text
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return `[askUser 错误] ${msg}`
    }
  }
}

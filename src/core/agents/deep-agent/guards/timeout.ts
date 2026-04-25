// Timeout —— AbortController 包装，统一管理总超时 + 单次工具超时
//
// 契约：
// - runDeepAgent 创建一个 TotalTimeout，传 signal 给 LangChain runnable
// - 每次工具调用可选派生子 AbortController（当 deepagents 支持 per-tool signal 时）
// - 超时触发后 disposed=true，避免重复 abort

export interface TimeoutOptions {
  /** 毫秒 */
  timeoutMs: number
  /** 可选外部 AbortSignal（如 CLI Ctrl+C），任一触发均 abort */
  parentSignal?: AbortSignal
  /** 超时触发回调（用于 trace） */
  onTimeout?: () => void
}

export class TimeoutGuard {
  private readonly controller: AbortController
  private timer: NodeJS.Timeout | null
  private disposed = false
  private _timedOut = false
  private readonly startedAt: number

  constructor(private readonly opts: TimeoutOptions) {
    this.controller = new AbortController()
    this.startedAt = Date.now()

    this.timer = setTimeout(() => {
      this._timedOut = true
      this.opts.onTimeout?.()
      this.controller.abort(new DOMException('timeout', 'TimeoutError'))
    }, opts.timeoutMs)

    if (opts.parentSignal) {
      if (opts.parentSignal.aborted) {
        this.controller.abort(opts.parentSignal.reason)
      } else {
        opts.parentSignal.addEventListener('abort', this.onParentAbort, { once: true })
      }
    }
  }

  private onParentAbort = (): void => {
    this.controller.abort(this.opts.parentSignal?.reason)
  }

  get signal(): AbortSignal {
    return this.controller.signal
  }

  get timedOut(): boolean {
    return this._timedOut
  }

  get elapsedMs(): number {
    return Date.now() - this.startedAt
  }

  /** 停止计时器 + 清理监听；幂等 */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.opts.parentSignal?.removeEventListener('abort', this.onParentAbort)
  }
}

/** 判断错误是否由超时触发（DOMException/AbortError/TimeoutError 均归一） */
export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { name?: string; code?: string }
  return (
    e.name === 'AbortError' ||
    e.name === 'TimeoutError' ||
    e.code === 'ABORT_ERR' ||
    e.code === 'ETIMEDOUT'
  )
}

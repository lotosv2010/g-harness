// 总超时守护：基于 AbortController + 定时器

export class TimeoutGuard {
  private readonly controller = new AbortController()
  private readonly timer: NodeJS.Timeout
  private expired = false

  constructor(totalMs: number) {
    this.timer = setTimeout(() => {
      this.expired = true
      this.controller.abort()
    }, totalMs)
  }

  get signal(): AbortSignal {
    return this.controller.signal
  }

  isExpired(): boolean {
    return this.expired
  }

  dispose(): void {
    clearTimeout(this.timer)
    if (!this.controller.signal.aborted) this.controller.abort('cleanup')
  }
}

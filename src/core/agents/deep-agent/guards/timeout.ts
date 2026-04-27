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

  /**
   * 清理计时器；不主动 abort（避免在成功路径上误伤仍在 flush 的资源）。
   * Node 的定时器若不 unref 也会阻塞 event loop 退出，所以这里必须 clearTimeout。
   */
  dispose(): void {
    clearTimeout(this.timer)
  }
}

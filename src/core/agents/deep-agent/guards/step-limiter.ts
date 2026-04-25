// StepLimiter —— 循环步数硬上限
//
// 与 CostTracker 配合使用：CostTracker 聚合 token，StepLimiter 仅计步。
// 独立原因：存在 token 很低但步数很多的场景（循环读小文件 / agent 自我反思），
// 需要能单独熔断步数。

export interface StepLimiterOptions {
  maxSteps: number
}

export class StepLimiter {
  private count = 0

  constructor(private readonly opts: StepLimiterOptions) {}

  /** 本步是否允许继续；返回 false 即已到上限 */
  allow(): boolean {
    return this.count < this.opts.maxSteps
  }

  /** 累加一步并返回是否仍可继续 */
  tick(): boolean {
    this.count += 1
    return this.allow()
  }

  get current(): number {
    return this.count
  }

  get limit(): number {
    return this.opts.maxSteps
  }

  /** 剩余步数（可能为负） */
  remaining(): number {
    return this.opts.maxSteps - this.count
  }

  /** 是否已超出 */
  isExceeded(): boolean {
    return this.count >= this.opts.maxSteps
  }
}

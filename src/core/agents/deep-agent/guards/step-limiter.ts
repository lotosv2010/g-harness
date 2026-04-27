// 循环步数上限

export class StepLimiter {
  private count = 0
  constructor(private readonly max: number) {}

  tick(): boolean {
    this.count += 1
    return this.count <= this.max
  }

  get current(): number {
    return this.count
  }

  exceeded(): boolean {
    return this.count > this.max
  }
}

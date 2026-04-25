// Trace 写入器 —— 按时间戳写 JSONL 追踪文件
//
// 设计要点：
// - 每次 runDeepAgent 独立一份 `docs/.gforge/agent-trace-{ts}.jsonl`
// - 每行一条 step（thought / tool_call / tool_result / message / error）
// - 末尾额外写一行 summary（steps/tokens/duration/status）
// - 使用 stream append，避免内存中聚合；CLI 崩溃也能保留已写入的步骤
// - 路径固定在目标项目下的 docs/.gforge/，便于追溯；需要确保目录存在

import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AgentStepEvent, CostReport } from '../types.js'

export interface TraceWriterOptions {
  targetDir: string
  /** 起始时间戳（默认 Date.now()），用于生成文件名 */
  startedAt?: number
}

export interface TraceSummary {
  status: 'success' | 'fallback' | 'error'
  steps: number
  durationMs: number
  cost: CostReport | null
  escalations?: Array<{ from: string; to: string; reason: string }>
  draftFiles?: string[]
  errorMessage?: string
}

export class TraceWriter {
  private readonly path: string
  private readonly startedAt: number
  private bufferedInit = false

  constructor(opts: TraceWriterOptions) {
    this.startedAt = opts.startedAt ?? Date.now()
    const ts = new Date(this.startedAt).toISOString().replace(/[:.]/g, '-')
    this.path = join(opts.targetDir, 'docs', '.gforge', `agent-trace-${ts}.jsonl`)
  }

  get filePath(): string {
    return this.path
  }

  /** 首次写入前确保目录存在；幂等 */
  private async ensureDir(): Promise<void> {
    if (this.bufferedInit) return
    await mkdir(dirname(this.path), { recursive: true })
    this.bufferedInit = true
  }

  /** 追加一条步事件。失败不抛错（trace 不得反杀主流程） */
  async append(event: AgentStepEvent): Promise<void> {
    try {
      await this.ensureDir()
      const line = JSON.stringify({ ...event, ts: event.timestamp }) + '\n'
      await appendFile(this.path, line, 'utf8')
    } catch {
      // trace 失败静默吞掉；调用方不应依赖其成功
    }
  }

  /** 写入总结行。每次 run 末尾调用一次 */
  async writeSummary(summary: TraceSummary): Promise<void> {
    try {
      await this.ensureDir()
      const line =
        JSON.stringify({
          kind: 'summary',
          ts: Date.now(),
          data: summary,
        }) + '\n'
      await appendFile(this.path, line, 'utf8')
    } catch {
      // 同 append
    }
  }
}

/** 把任意事件封装为 AgentStepEvent（便于调用方无需手工组装） */
export function makeStepEvent(
  kind: AgentStepEvent['kind'],
  data: Record<string, unknown>,
): AgentStepEvent {
  return { kind, timestamp: Date.now(), data }
}

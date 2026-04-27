// 轨迹日志写入：每步一行 JSONL

import { mkdir, appendFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AgentStepEvent } from '../types.js'

export class TraceWriter {
  readonly path: string
  private ready: Promise<void>

  constructor(targetDir: string, runId: string) {
    this.path = join(targetDir, 'docs', '.g-harness', `agent-trace-${runId}.jsonl`)
    this.ready = mkdir(dirname(this.path), { recursive: true }).then(() => {
      /* noop */
    })
  }

  async write(event: AgentStepEvent): Promise<void> {
    try {
      await this.ready
      await appendFile(this.path, JSON.stringify(event) + '\n', 'utf-8')
    } catch {
      // trace 失败不应影响主流程
    }
  }
}

export function createRunId(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
}

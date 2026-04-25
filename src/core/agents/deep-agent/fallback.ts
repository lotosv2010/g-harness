// 三级降级链：deep-agent → llm-enhance → template
//
// 设计要点：
// - 降级是"隐式契约"：deep-agent 失败（缺依赖/缺 key/超限/网络/解析）自动下沉
// - 每一级降级都记录原因 + 可观测，不静默
// - 最底层 template 路径永不失败（保留 v1.0 行为）
// - 本模块不做 I/O，仅编排；实际执行由注入的 runner 完成

import type { DraftFile, FallbackReason } from './types.js'
import type { ContentCompletion } from '../../analyzer/content-completer.js'

export type ModeTried = 'deep-agent' | 'llm-enhance' | 'template'

export interface DeepAgentRunner {
  run(): Promise<
    | { status: 'success'; drafts: DraftFile[] }
    | { status: 'fallback'; reason: FallbackReason; message: string; partialDrafts: DraftFile[] }
  >
}

export interface LlmEnhanceRunner {
  run(): Promise<{
    completion: ContentCompletion
    enhanced: boolean
    reason?: string
  }>
}

export interface TemplateRunner {
  run(): Promise<{ completion: ContentCompletion }>
}

export interface FallbackChainOptions {
  /** 用户请求的初始模式 */
  requestedMode: ModeTried
  deepAgent?: DeepAgentRunner
  llmEnhance: LlmEnhanceRunner
  template: TemplateRunner
  /** 降级事件回调（CLI 打印用） */
  onEscalate?: (event: EscalateEvent) => void
}

export interface EscalateEvent {
  from: ModeTried
  to: ModeTried
  reason: string
}

export type FallbackOutcome =
  | {
      mode: 'deep-agent'
      drafts: DraftFile[]
      /** 降级原因为空表示一次成功 */
      escalations: EscalateEvent[]
    }
  | {
      mode: 'llm-enhance' | 'template'
      completion: ContentCompletion
      enhanced?: boolean
      escalations: EscalateEvent[]
    }

/**
 * 按 requestedMode 启动，任一级失败自动下沉。
 * 返回最终落地的模式 + 产出 + 降级事件列表。
 */
export async function runFallbackChain(opts: FallbackChainOptions): Promise<FallbackOutcome> {
  const escalations: EscalateEvent[] = []

  // --- level 1: deep-agent ---
  if (opts.requestedMode === 'deep-agent') {
    if (!opts.deepAgent) {
      emit(opts, escalations, {
        from: 'deep-agent',
        to: 'llm-enhance',
        reason: 'runner-not-provided',
      })
    } else {
      const result = await opts.deepAgent.run()
      if (result.status === 'success') {
        return { mode: 'deep-agent', drafts: result.drafts, escalations }
      }
      emit(opts, escalations, {
        from: 'deep-agent',
        to: 'llm-enhance',
        reason: `${result.reason}: ${result.message}`,
      })
    }
  }

  // --- level 2: llm-enhance ---
  if (opts.requestedMode === 'deep-agent' || opts.requestedMode === 'llm-enhance') {
    try {
      const r = await opts.llmEnhance.run()
      if (r.enhanced) {
        return { mode: 'llm-enhance', completion: r.completion, enhanced: true, escalations }
      }
      // enhanced=false 说明 llm 层自己已回落（无 key / parse-error / empty）
      emit(opts, escalations, {
        from: 'llm-enhance',
        to: 'template',
        reason: r.reason ?? 'llm-returned-empty',
      })
    } catch (err) {
      emit(opts, escalations, {
        from: 'llm-enhance',
        to: 'template',
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // --- level 3: template（永不失败） ---
  const r = await opts.template.run()
  return { mode: 'template', completion: r.completion, escalations }
}

function emit(opts: FallbackChainOptions, list: EscalateEvent[], ev: EscalateEvent): void {
  list.push(ev)
  opts.onEscalate?.(ev)
}

/** 把 FallbackReason + 消息汇总为人类可读字符串 */
export function describeEscalations(escalations: EscalateEvent[]): string {
  if (escalations.length === 0) return '无降级'
  return escalations.map((e) => `${e.from} → ${e.to}（${e.reason}）`).join('；')
}

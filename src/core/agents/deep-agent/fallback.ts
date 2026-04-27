// Deep Agent 降级原因分类

import type { DeepAgentResult, DraftFile, CostReport, FallbackReason } from './types.js'

export function classifyError(err: unknown): FallbackReason {
  const msg = err instanceof Error ? err.message : String(err)
  const low = msg.toLowerCase()
  if (low.includes('timeout') || low.includes('aborted')) return 'timeout'
  if (low.includes('429') || low.includes('rate limit')) return 'network-error'
  if (low.includes('401') || low.includes('unauthorized') || low.includes('api key')) return 'no-key'
  if (low.includes('parse') || low.includes('json')) return 'parse-error'
  if (low.includes('fetch') || low.includes('network') || low.includes('socket')) return 'network-error'
  return 'unsupported'
}

export function buildFallback(
  reason: FallbackReason,
  message: string,
  partialDrafts: DraftFile[] = [],
  cost: CostReport | null = null,
): DeepAgentResult {
  return { status: 'fallback', reason, message, partialDrafts, cost }
}

export function summarizeFallback(result: DeepAgentResult): string {
  if (result.status === 'success') return 'Deep Agent 成功'
  return `Deep Agent 降级（${result.reason}）：${result.message}`
}

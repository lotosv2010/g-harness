// 从 deepagents 虚拟 FS / stream chunk 中提取结构化数据的纯函数集合。
// 与 runDeepAgent 主流程解耦，便于单测。

import { assertPathSafe } from './tools/security.js'
import { CostTracker } from './guards/cost-tracker.js'
import { StepLimiter } from './guards/step-limiter.js'
import type { AgentStepEvent, DraftFile } from './types.js'

/**
 * 从 deepagents 最终 state 里提取虚拟 FS（files 键值对）。
 * deepagents v2 FileData 为 `{content: string | string[] | Uint8Array, ...}`，
 * v1 legacy 为字符串数组；本函数统一展开为单一字符串。
 */
export function extractVirtualFiles(state: unknown): Record<string, string> {
  if (!state || typeof state !== 'object') return {}
  const obj = state as Record<string, unknown>
  const files = obj.files
  if (!files || typeof files !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(files as Record<string, unknown>)) {
    const text = coerceFileContent(v)
    if (text !== null) out[k] = text
  }
  return out
}

export function coerceFileContent(v: unknown): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return (v as string[]).join('\n')
  if (v && typeof v === 'object') {
    const fd = v as { content?: unknown }
    if (typeof fd.content === 'string') return fd.content
    if (Array.isArray(fd.content) && fd.content.every((x) => typeof x === 'string')) {
      return (fd.content as string[]).join('\n')
    }
  }
  return null
}

/**
 * 统一规范化虚拟 FS 路径。
 * 处理链：反斜杠 → 正斜杠；去盘符（C:/）；去前导 `./`、`/`；
 * 剥离沙盒常见前缀（app/、workspace/、project/、sandbox/、home/user/）；
 * 合并重复斜杠。
 */
export function canonicalPath(p: string): string {
  let out = p
    .replace(/\\+/g, '/')
    .replace(/^[a-zA-Z]:\//, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .trim()
  const sandboxPrefixes = ['app/', 'workspace/', 'project/', 'sandbox/', 'home/user/', 'tmp/', 'var/']
  for (const prefix of sandboxPrefixes) {
    if (out.startsWith(prefix)) {
      out = out.slice(prefix.length)
      break
    }
  }
  return out
}

/** 将虚拟 FS 按白名单过滤为 DraftFile[]，同时返回被拒绝的路径清单（用于诊断） */
export function filterWhitelist(
  files: Record<string, string>,
  whitelist: string[],
  targetDir: string,
): { drafts: DraftFile[]; rejected: string[] } {
  const allowed = new Set(whitelist.map(canonicalPath))
  const drafts: DraftFile[] = []
  const rejected: string[] = []
  for (const [path, content] of Object.entries(files)) {
    const norm = canonicalPath(path)
    if (!norm) {
      rejected.push(`${path} → (空路径)`)
      continue
    }
    if (!allowed.has(norm)) {
      rejected.push(`${path} → ${norm}`)
      continue
    }
    const safety = assertPathSafe(norm, targetDir)
    if (!safety.ok) {
      rejected.push(`${path} → ${norm} (安全检查拒绝)`)
      continue
    }
    drafts.push({ outputPath: norm, content, author: 'deep-agent' })
  }
  return { drafts, rejected }
}

/** 从 stream chunk 中抽取人类可读的步进信息，发射为 onStep 事件 */
export async function emitStreamEvents(
  chunk: unknown,
  emit: (event: AgentStepEvent) => Promise<void>,
  cost: CostTracker,
  limiter: StepLimiter,
): Promise<void> {
  if (!chunk || typeof chunk !== 'object') return
  const obj = chunk as Record<string, unknown>
  const messages = Array.isArray(obj.messages) ? obj.messages : null
  if (!messages || messages.length === 0) return

  // 只处理最新一条消息，避免重复打印
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const last = messages[messages.length - 1] as any
  const role = last?._getType?.() ?? last?.type ?? last?.role ?? 'unknown'
  const content = typeof last?.content === 'string' ? last.content : ''
  const toolCalls = Array.isArray(last?.tool_calls) ? last.tool_calls : []

  accumulateUsage(last?.usage_metadata, cost)

  if (toolCalls.length > 0) {
    limiter.tick()
    cost.incrementStep()
    for (const tc of toolCalls) {
      await emit({
        kind: 'tool_call',
        timestamp: Date.now(),
        data: { name: tc?.name ?? 'unknown', args: tc?.args ?? {} },
      })
    }
    if (content) {
      await emit({ kind: 'thought', timestamp: Date.now(), data: { text: truncate(content, 200) } })
    }
    return
  }

  if (role === 'tool' || role === 'ToolMessage') {
    await emit({
      kind: 'tool_result',
      timestamp: Date.now(),
      data: { name: last?.name ?? 'tool', preview: truncate(content, 160) },
    })
    return
  }

  if ((role === 'ai' || role === 'AIMessage') && content) {
    limiter.tick()
    cost.incrementStep()
    await emit({ kind: 'message', timestamp: Date.now(), data: { text: truncate(content, 200) } })
  }
}

function accumulateUsage(usage: unknown, cost: CostTracker): void {
  if (!usage || typeof usage !== 'object') return
  const u = usage as Record<string, unknown>
  cost.addUsage(Number(u.input_tokens ?? 0), Number(u.output_tokens ?? 0))
}

export function truncate(s: string, n: number): string {
  const oneLine = s.replace(/\s+/g, ' ').trim()
  return oneLine.length > n ? oneLine.slice(0, n) + '…' : oneLine
}

/** 从最终 state 聚合 token usage（stream 未命中的兜底路径） */
export function aggregateFinalUsage(final: unknown, cost: CostTracker): void {
  if (!final || typeof final !== 'object') return
  const msgs = (final as Record<string, unknown>).messages
  if (!Array.isArray(msgs)) return
  for (const m of msgs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accumulateUsage((m as any)?.usage_metadata, cost)
  }
}

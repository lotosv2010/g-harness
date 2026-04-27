// Deep Agent 依赖懒加载（v0.2.0）
//
// 设计要点：
// - deepagents / @langchain/* / zod 是 optionalDependencies
// - 任一缺失都不能导致 g-harness 主流程崩溃（降级链最外层）
// - 单次进程内缓存结果，避免重复动态 import
// - 仅在启用 deep-agent 路径时调用

export interface DeepAgentDeps {
  createDeepAgent: unknown
  ChatAnthropic: unknown
  ChatOpenAI: unknown
  tool: unknown
  z: unknown
}

export type DeepAgentLoadResult =
  | { ok: true; deps: DeepAgentDeps }
  | { ok: false; missing: string[] }

let cached: DeepAgentLoadResult | null = null

export async function loadDeepAgentDeps(): Promise<DeepAgentLoadResult> {
  if (cached) return cached

  const missing: string[] = []
  const resolved: Partial<DeepAgentDeps> = {}
  const entries: Array<[keyof DeepAgentDeps, string, string]> = [
    ['createDeepAgent', 'deepagents', 'createDeepAgent'],
    ['ChatAnthropic', '@langchain/anthropic', 'ChatAnthropic'],
    ['ChatOpenAI', '@langchain/openai', 'ChatOpenAI'],
    ['tool', '@langchain/core/tools', 'tool'],
    ['z', 'zod', 'z'],
  ]

  for (const [key, pkg, exp] of entries) {
    try {
      const mod = (await import(pkg)) as Record<string, unknown>
      const value = mod[exp] ?? mod.default
      if (value === undefined) {
        missing.push(pkg)
        continue
      }
      resolved[key] = value
    } catch {
      missing.push(pkg)
    }
  }

  cached = missing.length > 0 ? { ok: false, missing } : { ok: true, deps: resolved as DeepAgentDeps }
  return cached
}

/** 仅供测试使用 */
export function __resetLazyImportCache(): void {
  cached = null
}

// Deep Agent 依赖的懒加载入口
//
// 设计要点：
// - deepagents / @langchain/* / zod 均为 optionalDependencies
// - 任一缺失都不能导致 g-harness 主流程崩溃（呼应 ADR-010 三级降级链）
// - 单次进程内结果缓存，避免重复 import
// - 仅在 deep-agent 路径启用时调用

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

/**
 * 尝试动态加载 deep-agent 所需的全部 optional 依赖。
 * 任一缺失时返回 ok:false + 缺失的包名列表，不抛错。
 */
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

  if (missing.length > 0) {
    cached = { ok: false, missing }
    return cached
  }

  cached = { ok: true, deps: resolved as DeepAgentDeps }
  return cached
}

/** 仅供测试使用：重置缓存 */
export function __resetLazyImportCache(): void {
  cached = null
}

// Deep Agent 依赖懒加载（v0.2.1 多 provider 扩展）
//
// 设计要点：
// - deepagents / @langchain/* / zod 是 optionalDependencies
// - 任一缺失都不能导致 g-harness 主流程崩溃（降级链最外层）
// - 核心依赖（createDeepAgent / tool / z）缺失即 fail
// - provider-specific ChatModel（ChatDeepSeek / ChatGoogleGenerativeAI / ChatOllama）按需懒加载

export interface DeepAgentCoreDeps {
  createDeepAgent: unknown
  tool: unknown
  z: unknown
}

export interface DeepAgentDeps extends DeepAgentCoreDeps {
  /** 可选 chat 模型构造器，按 provider 懒加载；缺失即相关 provider 不可用 */
  ChatAnthropic?: unknown
  ChatOpenAI?: unknown
  ChatDeepSeek?: unknown
  ChatGoogleGenerativeAI?: unknown
  ChatOllama?: unknown
}

export type DeepAgentLoadResult =
  | { ok: true; deps: DeepAgentDeps }
  | { ok: false; missing: string[] }

let cached: DeepAgentLoadResult | null = null

/** 尝试 import 单个包的指定导出，失败返回 undefined */
async function tryImport(pkg: string, exp: string): Promise<unknown | undefined> {
  try {
    const mod = (await import(pkg)) as Record<string, unknown>
    return mod[exp] ?? mod.default
  } catch {
    return undefined
  }
}

export async function loadDeepAgentDeps(): Promise<DeepAgentLoadResult> {
  if (cached) return cached

  // 核心依赖（任一缺失整体 fail）
  const missing: string[] = []
  const createDeepAgent = await tryImport('deepagents', 'createDeepAgent')
  if (!createDeepAgent) missing.push('deepagents')
  const tool = await tryImport('@langchain/core/tools', 'tool')
  if (!tool) missing.push('@langchain/core')
  const z = await tryImport('zod', 'z')
  if (!z) missing.push('zod')

  if (missing.length > 0) {
    cached = { ok: false, missing }
    return cached
  }

  // 可选 chat 模型（缺失不整体 fail，只影响对应 provider）
  const ChatAnthropic = await tryImport('@langchain/anthropic', 'ChatAnthropic')
  const ChatOpenAI = await tryImport('@langchain/openai', 'ChatOpenAI')
  const ChatDeepSeek = await tryImport('@langchain/deepseek', 'ChatDeepSeek')
  const ChatGoogleGenerativeAI = await tryImport('@langchain/google-genai', 'ChatGoogleGenerativeAI')
  const ChatOllama = await tryImport('@langchain/ollama', 'ChatOllama')

  cached = {
    ok: true,
    deps: {
      createDeepAgent,
      tool,
      z,
      ChatAnthropic,
      ChatOpenAI,
      ChatDeepSeek,
      ChatGoogleGenerativeAI,
      ChatOllama,
    },
  }
  return cached
}

/** 查询某 provider 的 ChatModel 是否可用 */
export function getChatModelCtor(
  deps: DeepAgentDeps,
  key: 'ChatAnthropic' | 'ChatOpenAI' | 'ChatDeepSeek' | 'ChatGoogleGenerativeAI' | 'ChatOllama',
): unknown | undefined {
  return deps[key]
}

/** 仅供测试使用 */
export function __resetLazyImportCache(): void {
  cached = null
}

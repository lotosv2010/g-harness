// Deep Agent 工厂：将 ToolSpec + system prompt + subAgents 装配为可执行 agent。
//
// 注意：本模块不应在未加载 optional deps 的情况下被 import；由 index.ts 守门。

import { buildToolSpecs, type ToolContext, type ToolSpec } from './tools/index.js'
import { buildSystemPrompt } from './prompts/system-prompt.js'
import { SUBAGENTS } from './prompts/subagent-prompts.js'
import { DEFAULT_MODELS, PROVIDER_REGISTRY } from './config.js'
import {
  asChatModelCtor,
  asDeepAgentFactory,
  asToolFactory,
  type DeepAgentGraph,
} from './langchain-shims.js'
import type { DeepAgentDeps } from './lazy-import.js'
import type { AgentDefinition } from '../agent-registry.js'
import type { AgentProvider, Depth } from './types.js'

export interface BuildAgentInput {
  deps: DeepAgentDeps
  projectName: string
  projectDescription: string
  techStackText: string
  presetName: string
  presetKnowledgeSlug: string | null
  agents: AgentDefinition[]
  depth: Depth
  provider: AgentProvider
  model: string
  apiKey: string
  baseUrl?: string
  toolCtx: ToolContext
  enableAskUser: boolean
  fetchImpl?: typeof fetch
}

export interface BuiltAgent {
  /** deepagents 返回的 graph 实例（具 invoke / stream 方法） */
  graph: DeepAgentGraph
  systemPrompt: string
  toolSpecs: ToolSpec[]
  /** 实际使用的模型 ID */
  model: string
}

export class MissingChatModelError extends Error {
  constructor(public readonly provider: AgentProvider, public readonly pkg: string) {
    super(`Provider "${provider}" 需要 optional 依赖 ${pkg}，请 pnpm add -O ${pkg}`)
    this.name = 'MissingChatModelError'
  }
}

/** 根据 provider 构建 LangChain chat model 实例 */
function buildChatModel(input: BuildAgentInput): unknown {
  const { deps, provider, model, apiKey, baseUrl, fetchImpl } = input
  const cfg = PROVIDER_REGISTRY[provider]
  const effectiveBaseUrl = baseUrl ?? cfg.defaultBaseUrl

  switch (cfg.protocol) {
    case 'anthropic-compat': {
      if (!deps.ChatAnthropic) throw new MissingChatModelError(provider, '@langchain/anthropic')
      const Ctor = asChatModelCtor(deps.ChatAnthropic)
      return new Ctor({
        modelName: model,
        anthropicApiKey: apiKey,
        anthropicApiUrl: effectiveBaseUrl,
        maxTokens: 4096,
        ...(fetchImpl ? { clientOptions: { fetch: fetchImpl } } : {}),
      })
    }

    case 'openai-compat': {
      if (!deps.ChatOpenAI) throw new MissingChatModelError(provider, '@langchain/openai')
      const Ctor = asChatModelCtor(deps.ChatOpenAI)
      const extraKwargs = cfg.extraKwargs
      return new Ctor({
        model,
        apiKey,
        configuration: {
          ...(effectiveBaseUrl ? { baseURL: effectiveBaseUrl } : {}),
          ...(fetchImpl ? { fetch: fetchImpl } : {}),
        },
        ...(extraKwargs ? { modelKwargs: extraKwargs } : {}),
      })
    }

    case 'deepseek': {
      if (!deps.ChatDeepSeek) throw new MissingChatModelError(provider, '@langchain/deepseek')
      const Ctor = asChatModelCtor(deps.ChatDeepSeek)
      return new Ctor({
        apiKey,
        model,
        ...(effectiveBaseUrl ? { configuration: { baseURL: effectiveBaseUrl } } : {}),
      })
    }

    case 'google': {
      if (!deps.ChatGoogleGenerativeAI)
        throw new MissingChatModelError(provider, '@langchain/google-genai')
      const Ctor = asChatModelCtor(deps.ChatGoogleGenerativeAI)
      return new Ctor({ apiKey, model })
    }

    case 'ollama': {
      if (!deps.ChatOllama) throw new MissingChatModelError(provider, '@langchain/ollama')
      const Ctor = asChatModelCtor(deps.ChatOllama)
      return new Ctor({
        model,
        baseUrl: effectiveBaseUrl,
        temperature: 0,
        maxRetries: 2,
      })
    }

    default: {
      const _exhaustive: never = cfg.protocol
      throw new Error(`未知协议：${String(_exhaustive)}`)
    }
  }
}

/** 将 ToolSpec 列表包装为 deepagents 的 LangChain tool */
function wrapTools(deps: DeepAgentDeps, specs: ToolSpec[]): unknown[] {
  const tool = asToolFactory(deps.tool)
  return specs.map((spec) =>
    tool(spec.handler, {
      name: spec.name,
      description: spec.description,
      schema: spec.schema,
    }),
  )
}

export function buildDeepAgent(input: BuildAgentInput): BuiltAgent {
  const model = input.model || DEFAULT_MODELS[input.depth][input.provider]
  const systemPrompt = buildSystemPrompt({
    projectName: input.projectName,
    projectDescription: input.projectDescription,
    techStackText: input.techStackText,
    presetName: input.presetName,
    presetKnowledgeSlug: input.presetKnowledgeSlug,
    agents: input.agents,
  })

  const toolSpecs = buildToolSpecs(input.depth, input.toolCtx, input.deps.z, input.enableAskUser)
  const llmTools = wrapTools(input.deps, toolSpecs)
  const chatModel = buildChatModel({ ...input, model })

  const createDeepAgent = asDeepAgentFactory(input.deps.createDeepAgent)
  // deepagents@1.x 参数名为 systemPrompt（不是 instructions），字符串会被包装进 SystemMessage
  const graph = createDeepAgent({
    model: chatModel,
    tools: llmTools,
    systemPrompt,
    subagents: SUBAGENTS.map((s) => ({
      name: s.name,
      description: s.description,
      systemPrompt: s.prompt,
    })),
  })

  return { graph, systemPrompt, toolSpecs, model }
}

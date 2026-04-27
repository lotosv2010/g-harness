// Deep Agent 工厂：将 ToolSpec + system prompt + subAgents 装配为可执行 agent。
//
// 注意：本模块不应在未加载 optional deps 的情况下被 import；由 index.ts 守门。

import { buildToolSpecs, type ToolContext, type ToolSpec } from './tools/index.js'
import { buildSystemPrompt } from './prompts/system-prompt.js'
import { SUBAGENTS } from './prompts/subagent-prompts.js'
import { DEFAULT_MODELS } from './config.js'
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
  toolCtx: ToolContext
  enableAskUser: boolean
  fetchImpl?: typeof fetch
}

export interface BuiltAgent {
  /** deepagents 返回的 graph 实例（具 invoke / stream 方法） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graph: any
  systemPrompt: string
  toolSpecs: ToolSpec[]
  /** 实际使用的模型 ID */
  model: string
}

/** 根据 provider 构建 LangChain chat model 实例 */
function buildChatModel(input: BuildAgentInput): unknown {
  const { deps, provider, model, apiKey, fetchImpl } = input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ChatAnthropic = deps.ChatAnthropic as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ChatOpenAI = deps.ChatOpenAI as any

  if (provider === 'anthropic') {
    return new ChatAnthropic({
      model,
      apiKey,
      maxTokens: 4096,
      ...(fetchImpl ? { clientOptions: { fetch: fetchImpl } } : {}),
    })
  }
  return new ChatOpenAI({
    model,
    apiKey,
    ...(fetchImpl ? { configuration: { fetch: fetchImpl } } : {}),
  })
}

/** 将 ToolSpec 列表包装为 deepagents 的 LangChain tool */
function wrapTools(deps: DeepAgentDeps, specs: ToolSpec[]): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = deps.tool as any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createDeepAgent = input.deps.createDeepAgent as any
  const graph = createDeepAgent({
    model: chatModel,
    tools: llmTools,
    instructions: systemPrompt,
    subagents: SUBAGENTS.map((s) => ({
      name: s.name,
      description: s.description,
      prompt: s.prompt,
    })),
  })

  return { graph, systemPrompt, toolSpecs, model }
}

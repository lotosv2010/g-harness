// Agent Factory —— 统一组装 Deep Agent 运行实例
//
// 职责：
// 1. 根据 depth 决定启用哪些工具 + 模型 + 步数/超时上限
// 2. 解析 provider（显式 > env 优先级）并注入对应 ChatModel
// 3. 把纯执行器（tools/*.ts）包成 LangChain Tool（zod schema + format 汇报）
// 4. 调用 deepagents.createDeepAgent 返回可 invoke 的 runnable
//
// 非职责：
// - 不负责 prompt 构建（见 prompts/*）
// - 不负责成本追踪（见 guards/cost-tracker.ts）
// - 不负责 trace 写入（见 trace/trace-writer.ts）
// - 不自行降级；降级编排在 runDeepAgent（index.ts）内

import type { DeepAgentLoadResult } from './lazy-import.js'
import { DEPTH_PROFILES, DEFAULT_MODELS } from './config.js'
import type { AgentProvider, Depth } from './types.js'
import {
  readIndex, formatReadIndexResult, READ_INDEX_DESCRIPTION,
  readPackageJson, formatPackageJsonSummary, READ_PACKAGE_JSON_DESCRIPTION,
  readReadme, formatReadmeResult, READ_README_DESCRIPTION,
  listDir, formatListDirResult, LIST_DIR_DESCRIPTION,
  readFile, formatReadFileResult, READ_FILE_DESCRIPTION,
  grep, formatGrepResult, GREP_DESCRIPTION,
  readPresetKnowledge, formatPresetKnowledgeResult, READ_PRESET_KNOWLEDGE_DESCRIPTION,
  PathAccessError,
} from './tools/index.js'
import { createAskUser, ASK_USER_DESCRIPTION } from './tools/ask-user.js'

export interface AgentFactoryOptions {
  deps: Extract<DeepAgentLoadResult, { ok: true }>['deps']
  targetDir: string
  depth: Depth
  provider: AgentProvider
  apiKey: string
  systemPrompt: string
  /** 模型 ID 覆盖，否则按 DEFAULT_MODELS[depth] */
  model?: string
  /** 是否启用 askUser（交互模式 + 非 shallow 才允许），此处由上层决定 */
  enableAskUser?: boolean
  /** 子 Agent 规格（由 buildSubagents 产出），原样透传给 createDeepAgent */
  subagents?: Array<{ name: string; description: string; prompt: string }>
}

export interface BuiltAgent {
  /** 由 createDeepAgent 返回的 runnable（langgraph app） */
  runnable: unknown
  /** 本次实例将使用的实际模型 id */
  modelId: string
  /** 实际装载的工具名列表，用于 trace */
  toolNames: string[]
}

/**
 * 构建 Deep Agent 运行实例。失败时抛错，调用方负责降级。
 */
export function buildDeepAgent(opts: AgentFactoryOptions): BuiltAgent {
  const profile = DEPTH_PROFILES[opts.depth]
  const modelId = opts.model ?? DEFAULT_MODELS[opts.depth][opts.provider]
  const chatModel = buildChatModel(opts.deps, opts.provider, modelId, opts.apiKey)

  const tools = buildToolSet(opts)
  const toolNames = tools.map((t) => getToolName(t))

  const createDeepAgent = opts.deps.createDeepAgent as (
    cfg: Record<string, unknown>,
  ) => unknown

  const runnableCfg: Record<string, unknown> = {
    tools,
    instructions: opts.systemPrompt,
    model: chatModel,
    // langgraph recursionLimit = 步数上限 * 2（每步约 plan+act 两轮）
    recursionLimit: profile.maxSteps * 2,
  }
  if (opts.subagents && opts.subagents.length > 0) {
    runnableCfg.subagents = opts.subagents
  }

  const runnable = createDeepAgent(runnableCfg)

  return { runnable, modelId, toolNames }
}

/** 按 depth 决定工具集 */
function buildToolSet(opts: AgentFactoryOptions): unknown[] {
  const { deps, targetDir, depth } = opts
  const tool = deps.tool as (fn: (input: unknown) => Promise<string>, meta: unknown) => unknown
  const z = deps.z as ZLib

  const tools: unknown[] = [
    makeTool(tool, z, {
      name: 'read_index',
      description: READ_INDEX_DESCRIPTION,
      schema: z.object({}),
      run: async () => formatReadIndexResult(await readIndex(targetDir)),
    }),
    makeTool(tool, z, {
      name: 'read_package_json',
      description: READ_PACKAGE_JSON_DESCRIPTION,
      schema: z.object({}),
      run: async () => formatPackageJsonSummary(await readPackageJson(targetDir)),
    }),
    makeTool(tool, z, {
      name: 'read_readme',
      description: READ_README_DESCRIPTION,
      schema: z.object({}),
      run: async () => formatReadmeResult(await readReadme(targetDir)),
    }),
    makeTool(tool, z, {
      name: 'read_preset_knowledge',
      description: READ_PRESET_KNOWLEDGE_DESCRIPTION,
      schema: z.object({ presetName: z.string() }),
      run: async (args: { presetName: string }) =>
        formatPresetKnowledgeResult(await readPresetKnowledge(args.presetName)),
    }),
  ]

  if (depth === 'medium' || depth === 'deep') {
    tools.push(
      makeTool(tool, z, {
        name: 'list_dir',
        description: LIST_DIR_DESCRIPTION,
        schema: z.object({ path: z.string() }),
        run: wrapSafe(async (args: { path: string }) =>
          formatListDirResult(await listDir(args.path, targetDir)),
        ),
      }),
      makeTool(tool, z, {
        name: 'read_file',
        description: READ_FILE_DESCRIPTION,
        schema: z.object({
          path: z.string(),
          startLine: z.number().int().positive().optional(),
          maxLines: z.number().int().positive().optional(),
        }),
        run: wrapSafe(async (args: { path: string; startLine?: number; maxLines?: number }) =>
          formatReadFileResult(
            await readFile(args.path, targetDir, {
              startLine: args.startLine,
              maxLines: args.maxLines,
            }),
          ),
        ),
      }),
    )
  }

  if (depth === 'deep') {
    tools.push(
      makeTool(tool, z, {
        name: 'grep',
        description: GREP_DESCRIPTION,
        schema: z.object({
          pattern: z.string(),
          dir: z.string().optional(),
          maxHits: z.number().int().positive().optional(),
          includeExt: z.array(z.string()).optional(),
        }),
        run: wrapSafe(async (args: { pattern: string; dir?: string; maxHits?: number; includeExt?: string[] }) =>
          formatGrepResult(await grep(targetDir, args)),
        ),
      }),
    )
  }

  // askUser（可选，仅交互模式 + 中/深层启用）
  const profile = DEPTH_PROFILES[depth]
  if (opts.enableAskUser && profile.askUserLimit > 0) {
    const askUserExec = createAskUser({
      maxQuestions: profile.askUserLimit,
      interactive: process.stdout.isTTY !== false && process.stdin.isTTY !== false,
    })
    tools.push(
      makeTool(tool, z, {
        name: 'ask_user',
        description: ASK_USER_DESCRIPTION,
        schema: z.object({ question: z.string() }),
        run: async (args: { question: string }) => askUserExec(args),
      }),
    )
  }

  return tools
}

// --- helpers -----------------------------------------------------------------

interface ZLib {
  object: (shape?: Record<string, unknown>) => unknown
  string: () => { optional: () => unknown }
  number: () => { int: () => { positive: () => { optional: () => unknown } } }
  array: (item: unknown) => { optional: () => unknown }
}

interface ToolSpec<Args> {
  name: string
  description: string
  schema: unknown
  run: (args: Args) => Promise<string>
}

function makeTool<Args>(
  toolFactory: (fn: (input: unknown) => Promise<string>, meta: unknown) => unknown,
  _z: ZLib,
  spec: ToolSpec<Args>,
): unknown {
  return toolFactory(
    async (input: unknown) => {
      try {
        return await spec.run(input as Args)
      } catch (err) {
        if (err instanceof PathAccessError) {
          return `【工具 ${spec.name} 拒绝】${err.message}`
        }
        const msg = err instanceof Error ? err.message : String(err)
        return `【工具 ${spec.name} 出错】${msg}`
      }
    },
    { name: spec.name, description: spec.description, schema: spec.schema },
  )
}

/** 让执行器在 PathAccessError 时变成 LLM 可见的错误字符串而非抛错 */
function wrapSafe<Args>(
  fn: (args: Args) => Promise<string>,
): (args: Args) => Promise<string> {
  return async (args) => {
    try {
      return await fn(args)
    } catch (err) {
      if (err instanceof PathAccessError) {
        return `【路径拒绝】${err.message}`
      }
      throw err
    }
  }
}

function getToolName(tool: unknown): string {
  if (tool && typeof tool === 'object' && 'name' in tool) {
    const n = (tool as { name: unknown }).name
    if (typeof n === 'string') return n
  }
  return 'unknown'
}

function buildChatModel(
  deps: AgentFactoryOptions['deps'],
  provider: AgentProvider,
  modelId: string,
  apiKey: string,
): unknown {
  if (provider === 'anthropic') {
    const Ctor = deps.ChatAnthropic as new (cfg: Record<string, unknown>) => unknown
    return new Ctor({ model: modelId, apiKey, temperature: 0 })
  }
  const Ctor = deps.ChatOpenAI as new (cfg: Record<string, unknown>) => unknown
  return new Ctor({ model: modelId, apiKey, temperature: 0 })
}

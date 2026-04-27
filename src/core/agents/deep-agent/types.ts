// Deep Agent 公共类型层

import type { Preset } from '../../preset-loader.js'
import type { ScanResult } from '../../scanner/project-scanner.js'

/** 分析深度：浅（只读索引）→ 中（抽样入口）→ 深（全量反演） */
export type Depth = 'shallow' | 'medium' | 'deep'

/** LLM 供应商 */
export type AgentProvider = 'anthropic' | 'openai'

/** Agent 产出的草稿文件（落盘前的虚拟产物） */
export interface DraftFile {
  /** 相对 targetDir 的路径，如 'docs/SPEC.md' */
  outputPath: string
  content: string
  /** 来自哪个子 agent（用于 trace） */
  author?: string
}

/** 成本报告：单次运行的 token/费用聚合 */
export interface CostReport {
  provider: AgentProvider
  model: string
  inputTokens: number
  outputTokens: number
  /** 估算费用，美元 */
  estimatedUsd: number
  /** 循环步数 */
  steps: number
  /** 总耗时毫秒 */
  durationMs: number
}

/** runDeepAgent 主入口的输入 */
export interface DeepAgentOptions {
  targetDir: string
  scanResult: ScanResult
  preset: Preset | null
  projectName: string
  projectDescription: string
  depth: Depth
  /** 可选强制指定供应商，否则按环境变量优先级 anthropic > openai */
  provider?: AgentProvider
  /** 显式指定模型 ID（ADR-011），优先级 > DEFAULT_MODELS[depth][provider] */
  model?: string
  /** 显式指定 API Key（ADR-011，来自交互输入），优先级 > env */
  apiKey?: string
  /** 用户在 Stage 3 自填的技术栈原文（逗号分隔），优先于 scanner 识别结果作为 Agent 上下文 */
  userTechStack?: string
  /** 是否启用 askUser 工具（Human-in-the-loop）；非交互模式下强制 false */
  enableAskUser?: boolean
  /** 超时覆盖（毫秒），否则按 depth 默认值 */
  totalTimeoutMs?: number
  /** 步数覆盖，否则按 depth 默认值 */
  maxSteps?: number
  /** 注入 fetch 便于测试 */
  fetchImpl?: typeof fetch
  /** 实时事件回调（用于 CLI 打印思考/工具调用） */
  onStep?: (event: AgentStepEvent) => void
}

/** Agent 运行时的步事件（trace 单元） */
export interface AgentStepEvent {
  kind: 'thought' | 'tool_call' | 'tool_result' | 'message' | 'error'
  timestamp: number
  data: Record<string, unknown>
}

/** 降级原因 */
export type FallbackReason =
  | 'deps-missing'
  | 'no-key'
  | 'timeout'
  | 'step-limit'
  | 'token-limit'
  | 'network-error'
  | 'parse-error'
  | 'unsupported'

/** runDeepAgent 的运行结果 */
export type DeepAgentResult =
  | {
      status: 'success'
      drafts: DraftFile[]
      cost: CostReport
      tracePath: string
    }
  | {
      status: 'fallback'
      reason: FallbackReason
      message: string
      /** 已累积的部分草稿（可能为空） */
      partialDrafts: DraftFile[]
      /** 已消耗的成本（即使降级也要展示） */
      cost: CostReport | null
    }

/** Pre-flight 预估报告 */
export interface EstimateReport {
  depth: Depth
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedUsd: number
  estimatedDurationSec: number
  /** 若已知关键文件清单 */
  sampledFiles?: string[]
  /** 价目表数据源日期（yyyy-mm-dd） */
  pricingAsOf: string
}

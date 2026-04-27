// 生成策略公共接口（v0.2.0）

import type { AgentDefinition } from '../../agents/agent-registry.js'
import type { AgentProvider, Depth } from '../../agents/deep-agent/types.js'
import type { Preset } from '../../preset-loader.js'
import type { ProjectMeta, TemplateVariables } from '../../commands/init-types.js'
import type { ScanResult } from '../../scanner/project-scanner.js'

export interface DraftFile {
  /** 相对 targetDir 的路径 */
  outputPath: string
  content: string
}

export interface GenerationContext {
  targetDir: string
  harnessRoot: string
  agents: AgentDefinition[]
  preset: Preset | null
  meta: ProjectMeta
  scanResult: ScanResult
  variables: TemplateVariables
  /** LLM / Deep Agent 相关（按需） */
  depth?: Depth
  provider?: AgentProvider
  model?: string
  apiKey?: string
  fetchImpl?: typeof fetch
  /** 事件回调（CLI 可用于打印 trace） */
  onMessage?: (msg: string) => void
}

export interface StrategyResult {
  drafts: DraftFile[]
  /** 实际使用的策略名（链式降级时记录） */
  usedStrategy: 'template' | 'llm-enhance' | 'deep-agent'
  /** 降级原因（仅降级时） */
  degradedFrom?: 'deep-agent' | 'llm-enhance'
  degradeReason?: string
}

export interface GenerationStrategy {
  readonly name: 'template' | 'llm-enhance' | 'deep-agent'
  produce(ctx: GenerationContext): Promise<StrategyResult>
}

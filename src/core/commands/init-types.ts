// init 命令族共享类型（v0.2.0）

import type { AgentDefinition } from '../agents/agent-registry.js'
import type { AgentProvider, Depth } from '../agents/deep-agent/types.js'
import type { Preset } from '../preset-loader.js'
import type { ProjectDetection } from '../scanner/detect-project.js'
import type { ScanResult } from '../scanner/project-scanner.js'
import type { CategorySelectionMap } from '../template-categories.js'

/** 生成模式：三档可选，默认 template */
export type GenerateMode = 'template' | 'llm-enhance' | 'deep-agent'

/** 冲突策略 */
export type ConflictStrategy = 'skip' | 'overwrite' | 'prompt'

/** 项目元信息（面向模板变量的 source of truth） */
export interface ProjectMeta {
  /** 项目名（package.json / 目录名 / 用户输入） */
  projectName: string
  /** 一句话定位 */
  projectDescription: string
  /** 源码目录（如 src） */
  srcDir: string
  /** 用户自填的技术栈原文（逗号分隔，保留展示） */
  techStackText: string
}

/** CLI 入参规整后形式（v0.2.0） */
export interface InitCliOptions {
  preset?: string
  agents?: string[]
  name?: string
  conflict?: ConflictStrategy
  scan: boolean
  dryRun: boolean
  force: boolean
  full: boolean
  yes: boolean
  mode?: GenerateMode
  depth?: Depth
  model?: string
  provider?: AgentProvider
  apiKey?: string
  baseUrl?: string
  /** 用于向导入口检测是否应进入已有项目分支 */
  targetDir: string
}

/** Wizard 上下文：所有阶段共享的只读信息 */
export interface WizardContext {
  targetDir: string
  harnessRoot: string
  scanResult: ScanResult
  detection: ProjectDetection
  cli: InitCliOptions
  isInteractive: boolean
}

/** Wizard 产物：供 FileGenerator 消费 */
export interface WizardResult {
  agents: AgentDefinition[]
  preset: Preset | null
  presetName: string
  meta: ProjectMeta
  mode: GenerateMode
  depth?: Depth
  conflict: ConflictStrategy
  full: boolean
  installHook: boolean
  /** 用户模板选择结果：类别 id → 选中子项 id 列表 */
  templateSelection: CategorySelectionMap
  provider?: AgentProvider
  model?: string
  apiKey?: string
  baseUrl?: string
}

/** 12 键模板变量 schema（v0.2.0 终版） */
export interface TemplateVariables {
  // Identity (3)
  project_name: string
  project_description: string
  tech_stack: string

  // Architecture (3)
  architecture_overview: string
  module_breakdown: string
  project_structure: string

  // SPEC (2)
  core_value: string
  initial_features: string

  // Conventions (3)
  code_standards: string
  test_standards: string
  commands: string

  // 预设注入的目录变量（可选）
  [key: string]: string
}

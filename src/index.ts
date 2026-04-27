export { ProjectScanner } from './core/scanner/project-scanner.js'
export type { ScanResult, TechStack, ProjectStructure, ExistingConfig } from './core/scanner/project-scanner.js'

export { FileGenerator } from './core/generator/file-generator.js'
export type { GenerateOptions, GenerateResult } from './core/generator/file-generator.js'

export { RuleValidator } from './core/validator/rule-validator.js'
export type { ValidationResult } from './core/validator/rule-validator.js'

export { ConfigMigrator } from './core/migrator/config-migrator.js'

export { ContextAnalyzer } from './core/context/context-analyzer.js'
export type { ContextCheckResult, ContextSyncResult } from './core/context/context-analyzer.js'

export { loadPreset } from './core/preset-loader.js'
export type { Preset } from './core/preset-loader.js'

export { resolveVariables } from './core/variables.js'
export { getHarnessRoot } from './core/paths.js'

export { AGENT_REGISTRY, getAgent, getAgentOrThrow, listAgentIds } from './core/agents/agent-registry.js'
export type { AgentDefinition } from './core/agents/agent-registry.js'
export { AgentAdapter } from './core/agents/agent-adapter.js'
export type { FileEntry } from './core/agents/agent-adapter.js'

export { analyzeDescription, completeContent, autoDescribe, enhanceWithLlm } from './core/analyzer/index.js'
export type {
  DescriptionAnalysis,
  AppType,
  EnhanceInput,
  EnhanceResult,
} from './core/analyzer/index.js'

export { buildProjectIndex, renderProjectMap, renderFeatures, renderRoutes, detectIndexDrift } from './core/indexer/index.js'
export type {
  ProjectIndex,
  ModuleEntry,
  ModuleKind,
  RouteEntry,
  RouteFramework,
  FeatureEntry,
  DriftReport,
  DriftItem,
} from './core/indexer/index.js'

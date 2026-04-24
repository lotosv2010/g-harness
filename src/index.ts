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
export { getGForgeRoot } from './core/paths.js'

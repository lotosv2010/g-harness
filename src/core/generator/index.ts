// Generator 层 barrel

export { FileGenerator } from './file-generator.js'
export type { GenerateOptions, GenerateResult, WrittenFile } from './file-generator.js'
export { buildVariables } from './variables-builder.js'
export { collectTemplateFiles } from './file-collector.js'
export type { TemplateFile } from './file-collector.js'
export { TemplateStrategy } from './strategies/template-strategy.js'
export { LlmEnhanceStrategy } from './strategies/llm-enhance-strategy.js'
export { DeepAgentStrategy } from './strategies/deep-agent-strategy.js'
export type {
  GenerationStrategy,
  GenerationContext,
  StrategyResult,
  DraftFile,
} from './strategies/strategy-types.js'

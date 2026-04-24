// 规范迁移器 — 规范版本升级时迁移目标项目的配置文件
export { ConfigMigrator } from './config-migrator.js'
export type { MigrateOptions, MigrateResult } from './config-migrator.js'
export { detectVersion, getCurrentVersion, needsMigration } from './version-detector.js'
export { scanManagedFiles, hasGForgeMarker } from './file-scanner.js'
export { diffAndMerge, needsManualReview, parseSections } from './diff-engine.js'
export type { DiffResult, Section } from './diff-engine.js'
export {
  mergeSections,
  calculateCustomization,
  isSectionUserModified,
  normalizeWhitespace,
} from './section-merger.js'

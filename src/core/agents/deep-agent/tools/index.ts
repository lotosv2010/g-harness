// Deep Agent 只读工具集统一导出
//
// 所有工具：
// 1. 纯函数形式，接受 (args, targetDir) → Promise<Result>，无副作用
// 2. 对应 format* 函数将结果转为 LLM 可读文本
// 3. 路径安全统一走 tools/security.ts

export { assertPathSafe, isPathSafe, PathAccessError } from './security.js'

export {
  readIndex,
  formatReadIndexResult,
  READ_INDEX_DESCRIPTION,
  type ReadIndexResult,
} from './read-index.js'

export {
  readPackageJson,
  formatPackageJsonSummary,
  READ_PACKAGE_JSON_DESCRIPTION,
  type PackageJsonSummary,
} from './read-package-json.js'

export {
  readReadme,
  formatReadmeResult,
  READ_README_DESCRIPTION,
  type ReadReadmeResult,
} from './read-readme.js'

export {
  listDir,
  formatListDirResult,
  LIST_DIR_DESCRIPTION,
  type ListDirResult,
  type DirEntry,
} from './list-dir.js'

export {
  readFile,
  formatReadFileResult,
  READ_FILE_DESCRIPTION,
  type ReadFileResult,
  type ReadFileOptions,
} from './read-file.js'

export {
  grep,
  formatGrepResult,
  GREP_DESCRIPTION,
  type GrepResult,
  type GrepHit,
  type GrepOptions,
} from './grep.js'

export {
  readPresetKnowledge,
  formatPresetKnowledgeResult,
  READ_PRESET_KNOWLEDGE_DESCRIPTION,
  type ReadPresetKnowledgeResult,
  type PresetKnowledgeContext,
} from './read-preset-knowledge.js'

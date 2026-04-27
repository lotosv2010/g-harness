import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { fileExists, readDirSafe, isDirectory } from '../fs-utils.js'
import { resolveVariables } from '../variables.js'
import { AgentAdapter } from '../agents/agent-adapter.js'
import { analyzeDescription, completeContent, enhanceWithLlm } from '../analyzer/index.js'
import type { ContentCompletion } from '../analyzer/index.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { Preset } from '../preset-loader.js'
import type { ScanResult } from '../scanner/project-scanner.js'
import { runDeepAgent } from '../agents/deep-agent/index.js'
import type { AgentProvider, Depth, DeepAgentResult, DraftFile, FallbackReason } from '../agents/deep-agent/types.js'

export type GenerateMode = 'template' | 'llm-enhance' | 'deep-agent'

export interface ProjectMetaInput {
  projectName?: string
  projectDescription?: string
  srcDir?: string
  /** 用户自由文本的技术栈（来自 Stage 3，如 "TypeScript, React, Next.js, Tailwind CSS"） */
  techStack?: string
}

export interface GenerateOptions {
  harnessRoot: string
  preset: Preset | null
  targetDir: string
  scanResult: ScanResult
  overwrite: boolean
  dryRun: boolean
  full: boolean
  agents: AgentDefinition[]
  meta?: ProjectMetaInput
  onConflict?: (filePath: string) => Promise<boolean>
  /** 启用 LLM 内容增强（检测到 API key 时生效，失败自动降级到规则版） */
  useLlm?: boolean
  /** LLM 增强完成后的回调，用于 CLI 打印状态 */
  onLlmResult?: (info: { provider: string | null; enhanced: boolean; reason?: string }) => void
  /** 生成模式（v1.4）：template（默认）/ llm-enhance（兼容 useLlm）/ deep-agent */
  mode?: GenerateMode
  /** deep-agent 模式下的分析深度 */
  depth?: Depth
  /** 显式指定 LLM 供应商（ADR-011），仅 llm-enhance / deep-agent 生效 */
  provider?: AgentProvider
  /** 显式指定模型 ID（ADR-011） */
  model?: string
  /** 显式指定 API Key（ADR-011，来自交互输入），否则读 env */
  apiKey?: string
  /** deep-agent 结果回调（展示成本/降级原因） */
  onDeepAgentResult?: (info: {
    status: 'success' | 'fallback'
    reason?: FallbackReason
    message?: string
    draftCount: number
    costUsd: number | null
    tracePath?: string
  }) => void
}

export interface GenerateResult {
  created: string[]
  skipped: string[]
  overwritten: string[]
}

/** 把用户自填的逗号分隔技术栈文本转成多行列表（与 formatTechStack 保持同构） */
function formatUserTechStack(text: string): string {
  const items = text
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length === 0) return text.trim()
  return items.map((s) => `- ${s}`).join('\n')
}

export class FileGenerator {
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const result: GenerateResult = {
      created: [],
      skipped: [],
      overwritten: [],
    }

    // Deep Agent 模式：优先用 Agent 产出的白名单草稿覆盖同路径模板
    const agentDrafts = await this.runDeepAgentIfRequested(options)
    const draftMap = new Map<string, string>()
    for (const d of agentDrafts) draftMap.set(d.outputPath, d.content)

    const variables = await this.buildVariables(options)
    const filesToGenerate = await this.collectFiles(options)

    for (const file of filesToGenerate) {
      const targetPath = join(options.targetDir, file.outputPath)
      const exists = await fileExists(targetPath)

      if (exists && !options.overwrite) {
        if (options.onConflict) {
          const shouldOverwrite = await options.onConflict(file.outputPath)
          if (!shouldOverwrite) {
            result.skipped.push(file.outputPath)
            continue
          }
        } else {
          result.skipped.push(file.outputPath)
          continue
        }
      }

      // 若该文件有 Agent 草稿，直接使用（不做变量替换，Agent 已产出最终内容）
      const content = draftMap.has(file.outputPath)
        ? (draftMap.get(file.outputPath) as string)
        : resolveVariables(file.content, variables)

      if (!options.dryRun) {
        await mkdir(dirname(targetPath), { recursive: true })
        await writeFile(targetPath, content, 'utf-8')
      }

      if (exists) {
        result.overwritten.push(file.outputPath)
      } else {
        result.created.push(file.outputPath)
      }
    }

    return result
  }

  /**
   * 在 mode === 'deep-agent' 时跑一次 runDeepAgent，返回白名单草稿列表。
   * 任何失败（缺依赖/无 key/超限/解析错误）都透明降级为空数组，
   * 后续流程自动回落到模板+变量替换路径。
   */
  private async runDeepAgentIfRequested(options: GenerateOptions): Promise<DraftFile[]> {
    if (options.mode !== 'deep-agent') return []

    const projectName = options.meta?.projectName?.trim() || this.inferProjectName(options.targetDir)
    const projectDescription = options.meta?.projectDescription?.trim() || ''
    const depth: Depth = options.depth ?? 'medium'

    let result: DeepAgentResult
    try {
      result = await runDeepAgent({
        targetDir: options.targetDir,
        scanResult: options.scanResult,
        preset: options.preset,
        projectName,
        projectDescription,
        depth,
        provider: options.provider,
        model: options.model,
        apiKey: options.apiKey,
        userTechStack: options.meta?.techStack,
      })
    } catch (err) {
      options.onDeepAgentResult?.({
        status: 'fallback',
        reason: 'network-error',
        message: err instanceof Error ? err.message : String(err),
        draftCount: 0,
        costUsd: null,
      })
      return []
    }

    if (result.status === 'success') {
      options.onDeepAgentResult?.({
        status: 'success',
        draftCount: result.drafts.length,
        costUsd: result.cost.estimatedUsd,
        tracePath: result.tracePath,
      })
      return result.drafts
    }

    options.onDeepAgentResult?.({
      status: 'fallback',
      reason: result.reason,
      message: result.message,
      draftCount: result.partialDrafts.length,
      costUsd: result.cost?.estimatedUsd ?? null,
    })
    return result.partialDrafts
  }

  private async buildVariables(options: GenerateOptions): Promise<Record<string, string>> {
    const { preset, scanResult, meta } = options
    const projectName = meta?.projectName?.trim() || this.inferProjectName(options.targetDir)
    const projectDescription = meta?.projectDescription?.trim() || ''

    const analysis = analyzeDescription(projectDescription, {
      framework: scanResult.techStack.framework ?? null,
      runtime: scanResult.techStack.runtime ?? null,
    })
    const ruleBased = completeContent({
      projectName,
      projectDescription,
      analysis,
      scanResult,
      presetFragment: preset?.fragments,
    })

    // 可选 LLM 增强：无 key / 超时 / 解析失败都透明降级
    let completion: ContentCompletion = ruleBased
    if (options.useLlm) {
      const llm = await enhanceWithLlm({
        analysis,
        ruleBased,
        projectName,
        projectDescription,
        scanResult,
        provider: options.provider,
        model: options.model,
        apiKey: options.apiKey,
      })
      completion = llm.completion
      options.onLlmResult?.({
        provider: llm.provider,
        enhanced: llm.enhanced,
        reason: llm.reason,
      })
    }

    const base: Record<string, string> = {
      project_name: projectName,
      project_description: projectDescription || `${projectName} 项目`,
      project_positioning: completion.projectPositioning,
      core_value_table: completion.coreValueTable,
      product_boundaries: completion.productBoundaries,
      initial_features: completion.initialFeatures,
      nfr_hints: completion.nfrHints,
      module_breakdown: completion.moduleBreakdown,
      project_structure_hint: completion.projectStructureHint,
      tech_stack: this.formatTechStack(scanResult),
      architecture_overview: completion.architectureOverview,
      code_style_rules: this.formatCodeStyle(preset),
      commands: this.formatCommands(preset),
      module_map: completion.moduleBreakdown,
      // 用户自填的技术栈（若有）作为 tech_stack 的优先来源
      ...(meta?.techStack && meta.techStack.trim().length > 0
        ? { tech_stack: formatUserTechStack(meta.techStack) }
        : {}),
      reference_files: '',
      language_and_style: this.formatLanguageStyle(scanResult),
      naming_conventions: '- 文件名：kebab-case（`user-service.ts`）\n- 类名：PascalCase（`UserService`）\n- 函数/变量：camelCase（`getUserById`）\n- 常量：UPPER_SNAKE_CASE（`MAX_RETRY_COUNT`）\n- 接口：PascalCase，不加 I 前缀（`UserProfile`）',
      file_organization: '- 源码统一放 `src/` 目录\n- 测试文件与源文件同级（`foo.test.ts`）\n- 公共模块通过 `index.ts` 导出',
      architecture_constraints: '- 模块间单向依赖，禁止循环依赖\n- 外部请求集中在 API/Service 层\n- 每个模块通过入口文件暴露公共 API',
      test_standards: this.formatTestStandards(scanResult),
      branch_strategy: 'main ← 稳定版本\ndevelop ← 开发主线\nfeat/* ← 功能分支\nfix/* ← 修复分支',
      additional_roles: '',
      module_ownership_table: '| （待填写） | （待填写） | （待填写） |',
      // 目录约定的兜底默认值；preset.variables 会在下方覆盖这些
      shared_dir: 'src/shared',
      feature_dir: 'src/features',
      routes_dir: 'src/routes',
      services_dir: 'src/services',
    }

    if (preset?.variables) {
      Object.assign(base, preset.variables)
    }

    return base
  }

  private inferProjectName(targetDir: string): string {
    const parts = targetDir.split(/[/\\]/).filter(Boolean)
    return parts[parts.length - 1] ?? 'my-project'
  }

  private formatTechStack(scanResult: ScanResult): string {
    const { techStack } = scanResult
    const lines: string[] = []
    if (techStack.language) lines.push(`- 语言：${techStack.language}`)
    if (techStack.runtime) lines.push(`- 运行时：${techStack.runtime}`)
    if (techStack.framework) lines.push(`- 框架：${techStack.framework}`)
    if (techStack.buildTool) lines.push(`- 构建：${techStack.buildTool}`)
    if (techStack.testRunner) lines.push(`- 测试：${techStack.testRunner}`)
    if (techStack.packageManager) lines.push(`- 包管理：${techStack.packageManager}`)
    return lines.length > 0 ? lines.join('\n') : '- （请手动补充技术栈信息）'
  }

  private formatCodeStyle(preset: Preset | null): string {
    if (!preset?.codeStyle?.length) return '- （请根据项目约定补充）'
    return preset.codeStyle.map((s) => `- ${s}`).join('\n')
  }

  private formatLanguageStyle(scanResult: ScanResult): string {
    const { techStack } = scanResult
    const lines: string[] = []
    if (techStack.language) lines.push(`- 语言：${techStack.language}`)
    if (techStack.language?.includes('TypeScript')) {
      lines.push('- 启用 `strict: true`，禁止 `any`')
      lines.push('- 使用命名导出，禁止 `export default`')
    }
    if (techStack.framework) lines.push(`- 框架：遵循 ${techStack.framework} 官方最佳实践`)
    return lines.length > 0 ? lines.join('\n') : '- （请根据项目技术栈补充）'
  }

  private formatTestStandards(scanResult: ScanResult): string {
    const { techStack } = scanResult
    const lines = ['- 单元测试与源文件同级（`foo.test.ts`）', '- 每个测试用例独立，无顺序依赖']
    if (techStack.testRunner) lines.unshift(`- 测试框架：${techStack.testRunner}`)
    return lines.join('\n')
  }

  private formatCommands(preset: Preset | null): string {
    if (!preset?.commands) return '# （请补充常用命令）'
    return Object.entries(preset.commands)
      .map(([key, cmd]) => `${cmd.padEnd(22)}# ${key}`)
      .join('\n')
  }

  private async collectFiles(options: GenerateOptions): Promise<FileEntry[]> {
    const { harnessRoot, agents } = options
    const tplRoot = join(harnessRoot, 'src', 'templates')
    const adapter = new AgentAdapter()
    const files: FileEntry[] = []

    // 1. AGENTS.md 始终生成（agent 无关）
    const agentsTemplate = join(tplRoot, 'AGENTS.template.md')
    try {
      const content = await readFile(agentsTemplate, 'utf-8')
      files.push({ outputPath: 'AGENTS.md', content })
    } catch { /* 模板不存在则跳过 */ }

    // 2. 收集 .ai/ 下的通用规则/协议/钩子等模板文件
    const aiDir = join(tplRoot, '.ai')
    const aiTemplateFiles = await this.collectRecursive(aiDir, aiDir)
    // 给路径加上 .ai/ 前缀以便 adapter 映射
    const aiFilesWithPrefix = aiTemplateFiles.map((f) => ({
      outputPath: `.ai/${f.outputPath}`,
      content: f.content,
    }))

    // 3. 收集 docs/、tools/、tests/ 等非 .ai 模板（agent 无关）
    const nonAiFiles = await this.collectNonAiFiles(tplRoot)

    // 4. 为每个选中的 agent 生成入口文件 + 配置目录文件
    for (const agent of agents) {
      // 入口模板
      const entry = await adapter.loadEntryTemplate(harnessRoot, agent)
      if (entry) files.push(entry)

      // .ai/ 模板 → agent 特定配置目录
      const adapted = adapter.adaptFiles(aiFilesWithPrefix, agent)
      files.push(...adapted)

      // 预设特定规则 → agent 配置目录
      if (options.preset && agent.configDir) {
        const presetRulesDir = join(harnessRoot, 'src', 'presets', options.preset.name, 'rules')
        const presetFiles = await this.collectRecursive(presetRulesDir, presetRulesDir)
        for (const f of presetFiles) {
          files.push({ outputPath: `${agent.configDir}/rules/${f.outputPath}`, content: f.content })
        }
      }
    }

    // 5. 添加 agent 无关的文档/工具文件
    files.push(...nonAiFiles)

    // 非 --full 模式时过滤为核心层文件
    if (!options.full) {
      return files.filter((f) => this.isCoreFile(f.outputPath, agents))
    }

    return files
  }

  // 收集 docs/、tools/、tests/ 等非 .ai 的模板文件
  private async collectNonAiFiles(tplRoot: string): Promise<FileEntry[]> {
    const files: FileEntry[] = []
    const subDirs = ['docs', 'tools', 'tests']
    for (const sub of subDirs) {
      const dir = join(tplRoot, sub)
      const subFiles = await this.collectRecursive(dir, dir)
      for (const f of subFiles) {
        files.push({ outputPath: `${sub}/${f.outputPath}`, content: f.content })
      }
    }
    return files
  }

  // 核心层：Context + Constraint（第 1 天即生效的最小集合）
  private isCoreFile(outputPath: string, agents: AgentDefinition[]): boolean {
    // agent 入口文件始终是核心文件
    const entryFiles = agents.map((a) => a.entryFile).filter(Boolean)
    const coreExact = [
      'AGENTS.md',
      'docs/ARCHITECTURE.md',
      'docs/SPEC.md',
      ...entryFiles,
    ]
    if (coreExact.includes(outputPath)) return true

    // 各 agent 配置目录下的 rules/ protocols/ hooks/ settings 是核心文件
    for (const agent of agents) {
      if (!agent.configDir) continue
      const coreSuffixes = ['/rules/', '/protocols/', '/hooks/']
      for (const suffix of coreSuffixes) {
        if (outputPath.startsWith(`${agent.configDir}${suffix}`)) return true
      }
      if (outputPath === `${agent.configDir}/settings.json`) return true
    }

    return false
  }

  private async collectRecursive(dir: string, root: string): Promise<FileEntry[]> {
    const entries = await readDirSafe(dir)
    const files: FileEntry[] = []

    const skipDirs = ['git-hooks', 'entries']

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const isDir = await isDirectory(fullPath)

      if (isDir) {
        if (skipDirs.includes(entry)) continue
        files.push(...await this.collectRecursive(fullPath, root))
        continue
      }
      if (!this.isTemplateFile(entry)) continue

      const content = await readFile(fullPath, 'utf-8')
      const relPath = relative(root, fullPath).replace(/\\/g, '/')
      // .template.ext → .ext（去除模板后缀）
      const outputPath = relPath.replace(/\.template\.(\w+)$/, '.$1')
      files.push({ outputPath, content })
    }

    return files
  }

  private isTemplateFile(filename: string): boolean {
    const exts = ['.md', '.mjs', '.sh', '.json', '.txt']
    return exts.some((ext) => filename.endsWith(ext))
  }

}

interface FileEntry {
  outputPath: string
  content: string
}

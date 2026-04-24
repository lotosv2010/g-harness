import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { resolveVariables } from '../variables.js'
import { scanManagedFiles, hasGForgeMarker } from './file-scanner.js'
import { diffAndMerge, needsManualReview } from './diff-engine.js'
import { detectVersion, getCurrentVersion, needsMigration } from './version-detector.js'

/** 迁移选项 */
export interface MigrateOptions {
  /** 目标项目根目录 */
  targetDir: string
  /** G-Forge 安装根目录 */
  gforgeRoot: string
  /** 源版本（为空时自动检测） */
  fromVersion: string
  /** 目标版本（为空时使用当前版本） */
  toVersion: string
  /** 是否仅预览不写入 */
  dryRun: boolean
}

/** 迁移结果 */
export interface MigrateResult {
  /** 已迁移的文件（相对路径） */
  migrated: string[]
  /** 无需变更的文件（相对路径） */
  skipped: string[]
  /** 需手动审查的文件（相对路径） */
  manualRequired: string[]
  /** 检测到的源版本 */
  detectedFromVersion: string
  /** 目标版本 */
  targetToVersion: string
}

/**
 * 模板输出路径到模板源路径的映射规则：
 * - .claude/ → src/templates/.ai/
 * - CLAUDE.md → src/templates/CLAUDE.template.md
 * - AGENTS.md → src/templates/AGENTS.template.md
 * - docs/XXX.md → src/templates/docs/XXX.template.md
 */
function resolveTemplatePath(gforgeRoot: string, outputPath: string): string {
  const tplRoot = join(gforgeRoot, 'src', 'templates')

  // .claude/ 目录映射回 .ai/
  if (outputPath.startsWith('.claude/')) {
    const aiPath = outputPath.replace(/^\.claude\//, '.ai/')
    return join(tplRoot, aiPath)
  }

  // 根级 .md 文件添加 .template 后缀
  if (outputPath === 'CLAUDE.md') return join(tplRoot, 'CLAUDE.template.md')
  if (outputPath === 'AGENTS.md') return join(tplRoot, 'AGENTS.template.md')

  // docs/ 下的 .md 文件添加 .template 后缀
  if (outputPath.startsWith('docs/') && outputPath.endsWith('.md')) {
    const templateName = outputPath.replace(/\.md$/, '.template.md')
    return join(tplRoot, templateName)
  }

  return join(tplRoot, outputPath)
}

/**
 * 从模板和用户文件中逆向提取变量值
 *
 * 原理：找到模板中 {{variable}} 所在行，用占位符两侧的文本作为锚点，
 * 从用户文件的对应行中提取出被替换的实际值。
 */
function extractVariablesFromTemplate(
  templateContent: string,
  userContent: string,
): Record<string, string> {
  const variables: Record<string, string> = {}
  const varPattern = /\{\{(\w+)\}\}/g
  const templateLines = templateContent.split('\n')
  const userLines = userContent.split('\n')

  for (let i = 0; i < templateLines.length && i < userLines.length; i++) {
    const tplLine = templateLines[i]
    let match: RegExpExecArray | null
    varPattern.lastIndex = 0
    while ((match = varPattern.exec(tplLine)) !== null) {
      const varName = match[1]
      const prefix = tplLine.slice(0, match.index)
      const suffix = tplLine.slice(match.index + match[0].length)
      const userLine = userLines[i]

      if (userLine.startsWith(prefix) && userLine.endsWith(suffix)) {
        const endIdx = suffix.length > 0 ? userLine.length - suffix.length : undefined
        const value = userLine.slice(prefix.length, endIdx)
        if (value && value !== `{{${varName}}}`) {
          variables[varName] = value
        }
      }
    }
  }
  return variables
}

/**
 * 配置文件迁移器 — 在 G-Forge 规范版本升级时迁移目标项目的配置文件
 */
export class ConfigMigrator {
  /**
   * 执行迁移
   */
  async migrate(options: MigrateOptions): Promise<MigrateResult> {
    const fromVersion = options.fromVersion || await detectVersion(options.targetDir)
    const toVersion = options.toVersion || getCurrentVersion()

    const result: MigrateResult = {
      migrated: [],
      skipped: [],
      manualRequired: [],
      detectedFromVersion: fromVersion,
      targetToVersion: toVersion,
    }

    // 检查是否需要迁移
    if (!needsMigration(fromVersion, toVersion)) {
      return result
    }

    // 扫描目标项目中的受管文件
    const managedFiles = await scanManagedFiles(options.targetDir)

    // 逐文件处理迁移
    for (const file of managedFiles) {
      await this.migrateFile(file.relativePath, file.content, options, result)
    }

    // 在非预览模式下写入版本文件
    if (!options.dryRun) {
      await this.writeVersionFile(options.targetDir, toVersion)
    }

    return result
  }

  /** 迁移单个文件 */
  private async migrateFile(
    relativePath: string,
    currentContent: string,
    options: MigrateOptions,
    result: MigrateResult,
  ): Promise<void> {
    // 读取对应的模板文件
    const templatePath = resolveTemplatePath(options.gforgeRoot, relativePath)
    const templateContent = await this.readTemplateSafe(templatePath)

    if (!templateContent) {
      // 没有对应模板（可能是用户自行添加的文件），跳过
      result.skipped.push(relativePath)
      return
    }

    // 如果文件不包含 G-Forge 标记，可能是用户完全自定义的
    if (!hasGForgeMarker(currentContent)) {
      result.skipped.push(relativePath)
      return
    }

    // 从用户文件逆向提取变量值，用于解析新模板
    const variables = extractVariablesFromTemplate(templateContent, currentContent)
    const resolvedTemplate = resolveVariables(templateContent, variables)

    // 差异比较与合并
    const diff = diffAndMerge(currentContent, resolvedTemplate)

    if (!diff.hasChanges) {
      result.skipped.push(relativePath)
      return
    }

    // 用户重度自定义的文件标记为需手动审查
    if (needsManualReview(diff.customizationRatio)) {
      result.manualRequired.push(relativePath)
      return
    }

    // 写入合并后的内容
    if (!options.dryRun) {
      const fullPath = join(options.targetDir, relativePath)
      await mkdir(dirname(fullPath), { recursive: true })
      await writeFile(fullPath, diff.mergedContent, 'utf-8')
    }

    result.migrated.push(relativePath)
  }

  /** 安全读取模板文件，不存在时返回 null */
  private async readTemplateSafe(templatePath: string): Promise<string | null> {
    try {
      return await readFile(templatePath, 'utf-8')
    } catch {
      return null
    }
  }

  /** 写入 .gforge-version 文件 */
  private async writeVersionFile(targetDir: string, version: string): Promise<void> {
    const versionPath = join(targetDir, '.gforge-version')
    await writeFile(versionPath, `${version}\n`, 'utf-8')
  }
}

import { readFile, writeFile, mkdir, access, readdir, stat } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'
import { resolveVariables } from '../variables.js'
import type { Preset } from '../preset-loader.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface GenerateOptions {
  gforgeRoot: string
  preset: Preset | null
  targetDir: string
  scanResult: ScanResult
  overwrite: boolean
  dryRun: boolean
}

export interface GenerateResult {
  created: string[]
  skipped: string[]
  overwritten: string[]
}

export class FileGenerator {
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const result: GenerateResult = {
      created: [],
      skipped: [],
      overwritten: [],
    }

    const variables = this.buildVariables(options)
    const filesToGenerate = await this.collectFiles(options)

    for (const file of filesToGenerate) {
      const targetPath = join(options.targetDir, file.outputPath)
      const exists = await this.fileExists(targetPath)

      if (exists && !options.overwrite) {
        result.skipped.push(file.outputPath)
        continue
      }

      const content = resolveVariables(file.content, variables)

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

  private buildVariables(options: GenerateOptions): Record<string, string> {
    const { preset, scanResult } = options
    const base: Record<string, string> = {
      project_description: '项目描述（请更新）',
      tech_stack: this.formatTechStack(scanResult),
      architecture_overview: '详见项目架构文档。',
      code_style_rules: this.formatCodeStyle(preset),
      commands: this.formatCommands(preset),
      module_map: '（请根据项目实际结构更新）',
      reference_files: '',
      language_and_style: '（请根据项目技术栈补充）',
      naming_conventions: '（请根据项目约定补充）',
      file_organization: '（请根据项目结构补充）',
      architecture_constraints: '（请根据项目架构补充）',
      test_standards: '（请根据项目测试框架补充）',
      branch_strategy: 'main ← 稳定版本\ndevelop ← 开发主线\nfeat/* ← 功能分支\nfix/* ← 修复分支',
      additional_roles: '',
      module_ownership_table: '| （待填写） | （待填写） | （待填写） |',
    }

    if (preset?.variables) {
      Object.assign(base, preset.variables)
    }

    return base
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

  private formatCommands(preset: Preset | null): string {
    if (!preset?.commands) return '# （请补充常用命令）'
    return Object.entries(preset.commands)
      .map(([key, cmd]) => `${cmd.padEnd(22)}# ${key}`)
      .join('\n')
  }

  private async collectFiles(options: GenerateOptions): Promise<FileEntry[]> {
    const { gforgeRoot } = options
    const tplRoot = join(gforgeRoot, 'src', 'templates')

    // 递归遍历 templates/，目录结构即输出结构
    const files = await this.collectRecursive(tplRoot, tplRoot)

    // 追加预设特定规则
    if (options.preset) {
      const presetRulesDir = join(gforgeRoot, 'src', 'presets', options.preset.name, 'rules')
      const presetFiles = await this.collectRecursive(presetRulesDir, presetRulesDir)
      for (const f of presetFiles) {
        files.push({ outputPath: `.claude/rules/${f.outputPath}`, content: f.content })
      }
    }

    return files
  }

  private async collectRecursive(dir: string, root: string): Promise<FileEntry[]> {
    const entries = await this.readDirSafe(dir)
    const files: FileEntry[] = []

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const isDir = await this.isDirectory(fullPath)

      if (isDir) {
        files.push(...await this.collectRecursive(fullPath, root))
        continue
      }
      if (!entry.endsWith('.md')) continue

      const content = await readFile(fullPath, 'utf-8')
      const relPath = relative(root, fullPath).replace(/\\/g, '/')
      const outputPath = relPath.replace('.template.md', '.md')
      files.push({ outputPath, content })
    }

    return files
  }

  private async readDirSafe(dirPath: string): Promise<string[]> {
    try {
      return await readdir(dirPath)
    } catch {
      return []
    }
  }

  private async isDirectory(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isDirectory()
    } catch {
      return false
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }
}

interface FileEntry {
  outputPath: string
  content: string
}

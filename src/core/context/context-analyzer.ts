import { readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists, readDirSafe } from '../fs-utils.js'
import { ProjectScanner } from '../scanner/project-scanner.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface ContextCheckResult {
  consistent: boolean
  issues: ContextIssue[]
}

export interface ContextIssue {
  field: string
  expected: string
  actual: string
  severity: 'error' | 'warning'
}

export interface ContextSyncResult {
  updated: boolean
  changes: string[]
}

export class ContextAnalyzer {
  // 检查 CLAUDE.md 是否与项目实际结构一致
  async check(targetDir: string): Promise<ContextCheckResult> {
    const issues: ContextIssue[] = []
    const claudeMdPath = join(targetDir, 'CLAUDE.md')

    if (!(await fileExists(claudeMdPath))) {
      issues.push({
        field: 'CLAUDE.md',
        expected: '文件存在',
        actual: '文件不存在',
        severity: 'error',
      })
      return { consistent: false, issues }
    }

    const content = await readFile(claudeMdPath, 'utf-8')
    const scanner = new ProjectScanner()
    const scanResult = await scanner.scan(targetDir)

    this.checkTechStack(content, scanResult, issues)
    this.checkModuleMap(content, targetDir, issues)
    await this.checkReferencedFiles(content, targetDir, issues)

    return { consistent: issues.length === 0, issues }
  }

  // 扫描项目并更新 CLAUDE.md 中的动态段落
  async sync(targetDir: string): Promise<ContextSyncResult> {
    const claudeMdPath = join(targetDir, 'CLAUDE.md')
    const changes: string[] = []

    if (!(await fileExists(claudeMdPath))) {
      return { updated: false, changes: ['CLAUDE.md 不存在，请先运行 gforge init'] }
    }

    let content = await readFile(claudeMdPath, 'utf-8')
    const scanner = new ProjectScanner()
    const scanResult = await scanner.scan(targetDir)

    // 更新技术栈段落
    const techUpdate = this.updateTechStackSection(content, scanResult)
    if (techUpdate.changed) {
      content = techUpdate.content
      changes.push('更新技术栈信息')
    }

    // 更新模块地图
    const moduleUpdate = await this.updateModuleMapSection(content, targetDir)
    if (moduleUpdate.changed) {
      content = moduleUpdate.content
      changes.push('更新模块地图')
    }

    if (changes.length > 0) {
      await writeFile(claudeMdPath, content, 'utf-8')
    }

    return { updated: changes.length > 0, changes }
  }

  private checkTechStack(content: string, scanResult: ScanResult, issues: ContextIssue[]): void {
    const { techStack } = scanResult
    if (techStack.language && !content.includes(techStack.language)) {
      issues.push({
        field: '技术栈-语言',
        expected: techStack.language,
        actual: '未在 CLAUDE.md 中提及',
        severity: 'warning',
      })
    }
    if (techStack.framework && !content.includes(techStack.framework)) {
      issues.push({
        field: '技术栈-框架',
        expected: techStack.framework,
        actual: '未在 CLAUDE.md 中提及',
        severity: 'warning',
      })
    }
    if (techStack.packageManager && !content.includes(techStack.packageManager)) {
      issues.push({
        field: '技术栈-包管理',
        expected: techStack.packageManager,
        actual: '未在 CLAUDE.md 中提及',
        severity: 'warning',
      })
    }
  }

  private checkModuleMap(content: string, targetDir: string, issues: ContextIssue[]): void {
    if (!content.includes('模块地图') && !content.includes('module_map')) return

    // 检查 src/ 目录是否存在但未在模块地图中体现
    const srcRef = content.includes('src/')
    if (!srcRef) {
      issues.push({
        field: '模块地图',
        expected: '包含 src/ 目录结构',
        actual: '模块地图中未提及 src/',
        severity: 'warning',
      })
    }
  }

  private async checkReferencedFiles(
    content: string,
    targetDir: string,
    issues: ContextIssue[],
  ): Promise<void> {
    // 提取 CLAUDE.md 中引用的文件路径
    const fileRefs = content.match(/`([^`]+\.(md|ts|js|json))`/g) ?? []
    for (const ref of fileRefs) {
      const filePath = ref.replace(/`/g, '')
      // 跳过示例和占位符
      if (filePath.includes('{{') || filePath.includes('foo')) continue
      if (filePath.startsWith('http')) continue

      const fullPath = join(targetDir, filePath)
      if (!(await fileExists(fullPath))) {
        issues.push({
          field: '引用文件',
          expected: `${filePath} 存在`,
          actual: `${filePath} 不存在`,
          severity: 'warning',
        })
      }
    }
  }

  private updateTechStackSection(
    content: string,
    scanResult: ScanResult,
  ): { content: string; changed: boolean } {
    const { techStack } = scanResult
    const lines: string[] = []
    if (techStack.language) lines.push(`- 语言：${techStack.language}`)
    if (techStack.runtime) lines.push(`- 运行时：${techStack.runtime}`)
    if (techStack.framework) lines.push(`- 框架：${techStack.framework}`)
    if (techStack.buildTool) lines.push(`- 构建：${techStack.buildTool}`)
    if (techStack.testRunner) lines.push(`- 测试：${techStack.testRunner}`)
    if (techStack.packageManager) lines.push(`- 包管理：${techStack.packageManager}`)

    if (lines.length === 0) return { content, changed: false }

    const newSection = lines.join('\n')

    // 找到 ## 技术栈 到下一个 ## 之间的内容并替换
    const pattern = /(## 技术栈\n\n)([\s\S]*?)(\n\n## )/
    const match = content.match(pattern)
    if (!match) return { content, changed: false }

    const oldSection = match[2].trim()
    if (oldSection === newSection) return { content, changed: false }

    const updated = content.replace(pattern, `$1${newSection}\n$3`)
    return { content: updated, changed: true }
  }

  private async updateModuleMapSection(
    content: string,
    targetDir: string,
  ): Promise<{ content: string; changed: boolean }> {
    // 扫描 src/ 顶层目录生成模块地图
    const srcDir = join(targetDir, 'src')
    if (!(await fileExists(srcDir))) return { content, changed: false }

    const entries = await readDirSafe(srcDir)
    const dirs: string[] = []
    for (const entry of entries) {
      try {
        const s = await stat(join(srcDir, entry))
        if (s.isDirectory()) dirs.push(entry)
      } catch {
        // 忽略
      }
    }

    if (dirs.length === 0) return { content, changed: false }

    const tree = dirs.map((d) => `src/${d}/`).join('\n')

    const pattern = /(## 模块地图\n\n```\n)([\s\S]*?)(```)/
    const match = content.match(pattern)
    if (!match) return { content, changed: false }

    const oldTree = match[2].trim()
    if (oldTree === tree) return { content, changed: false }

    const updated = content.replace(pattern, `$1${tree}\n$3`)
    return { content: updated, changed: true }
  }

}

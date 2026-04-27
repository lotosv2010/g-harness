// Agent 适配器：将通用模板映射为 agent 特定输出

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentDefinition } from './agent-registry.js'

export interface FileEntry {
  outputPath: string
  content: string
}

export class AgentAdapter {
  // 将 .ai/ 下的模板路径映射到 agent 特定的输出路径
  mapOutputPath(templateRelPath: string, agent: AgentDefinition): string {
    // .ai/ 前缀替换为 agent 的 configDir
    if (!agent.configDir) return templateRelPath
    return templateRelPath.replace(/^\.ai\//, `${agent.configDir}/`)
  }

  // 过滤 agent 不支持的文件类型
  filterSupported(files: FileEntry[], agent: AgentDefinition): FileEntry[] {
    return files.filter((f) => {
      const path = f.outputPath

      // hooks 仅 Claude Code 支持
      if (path.includes('/hooks/') && !agent.supportsHooks) return false

      // skills 仅 Claude Code 支持
      if (path.includes('/skills/') && !agent.supportsSkills) return false

      // settings.json 仅 Claude Code 支持
      if (path.endsWith('settings.json') && !agent.supportsSettings) return false

      // protocols 仅 Claude Code 支持
      if (path.includes('/protocols/') && !agent.supportsProtocols) return false

      // guardrails 仅 Claude Code 支持
      if (path.includes('/guardrails/') && !agent.supportsGuardrails) return false

      // prompts 目录仅 Claude Code 支持
      if (path.includes('/prompts/') && agent.id !== 'claude') return false

      return true
    })
  }

  // 加载 agent 专属的入口模板
  async loadEntryTemplate(harnessRoot: string, agent: AgentDefinition): Promise<FileEntry | null> {
    if (!agent.entryTemplate || !agent.entryFile) return null

    const templatePath = join(harnessRoot, 'src', 'templates', 'entries', agent.entryTemplate)
    try {
      const content = await readFile(templatePath, 'utf-8')
      return { outputPath: agent.entryFile, content }
    } catch {
      return null
    }
  }

  // 将 .ai/ 模板文件集映射为 agent 特定的输出文件集
  adaptFiles(templateFiles: FileEntry[], agent: AgentDefinition): FileEntry[] {
    // generic 模式不输出配置目录文件
    if (agent.id === 'generic') return []

    const supported = this.filterSupported(templateFiles, agent)
    return supported.map((f) => ({
      outputPath: this.mapOutputPath(f.outputPath, agent),
      content: f.content,
    }))
  }
}

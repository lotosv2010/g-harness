// Agent 适配器：将通用模板映射为 agent 特定输出（v0.2.0）

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentDefinition } from './agent-registry.js'

export interface FileEntry {
  outputPath: string
  content: string
}

export class AgentAdapter {
  /** 将 shared 目录下 .ai/ 前缀映射到 agent 的 configDir */
  mapOutputPath(templateRelPath: string, agent: AgentDefinition): string {
    if (!agent.configDir) return templateRelPath
    return templateRelPath.replace(/^\.ai\//, `${agent.configDir}/`)
  }

  /** 过滤 agent 不支持的文件类型 */
  filterSupported(files: FileEntry[], agent: AgentDefinition): FileEntry[] {
    return files.filter((f) => {
      const path = f.outputPath
      if (path.includes('/hooks/') && !agent.supportsHooks) return false
      if (path.includes('/skills/') && !agent.supportsSkills) return false
      if (path.endsWith('settings.json') && !agent.supportsSettings) return false
      if (path.includes('/protocols/') && !agent.supportsProtocols) return false
      if (path.includes('/guardrails/') && !agent.supportsGuardrails) return false
      if (path.includes('/prompts/') && agent.id !== 'claude') return false
      return true
    })
  }

  /** 加载 agent 专属入口模板 */
  async loadEntryTemplate(harnessRoot: string, agent: AgentDefinition): Promise<FileEntry | null> {
    if (!agent.entryTemplate || !agent.entryFile) return null
    const templatePath = join(harnessRoot, 'src', 'templates', agent.entryTemplate)
    try {
      const content = await readFile(templatePath, 'utf-8')
      return { outputPath: agent.entryFile, content }
    } catch {
      return null
    }
  }

  /** 将共享模板映射为 agent 特定输出集合 */
  adaptFiles(templateFiles: FileEntry[], agent: AgentDefinition): FileEntry[] {
    if (agent.id === 'generic') return []
    const supported = this.filterSupported(templateFiles, agent)
    return supported.map((f) => ({
      outputPath: this.mapOutputPath(f.outputPath, agent),
      content: f.content,
    }))
  }
}

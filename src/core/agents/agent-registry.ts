// Agent 注册表：定义支持的 AI 开发助手及其配置格式（v0.2.0）

export interface AgentDefinition {
  id: string
  name: string
  vendor: string
  /** 目标项目里的入口文件相对路径 */
  entryFile: string
  /** 目标项目里的配置目录相对路径；null 表示无独立配置目录 */
  configDir: string | null
  /**
   * 入口模板相对路径（相对 src/templates/）。
   * 例如 'claude/CLAUDE.template.md'。
   */
  entryTemplate: string
  // 能力标记
  supportsHooks: boolean
  supportsSkills: boolean
  supportsSettings: boolean
  supportsProtocols: boolean
  supportsGuardrails: boolean
  entryFormat: 'markdown' | 'plaintext'
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    vendor: 'Anthropic',
    entryFile: 'CLAUDE.md',
    configDir: '.claude',
    entryTemplate: 'claude/CLAUDE.template.md',
    supportsHooks: true,
    supportsSkills: true,
    supportsSettings: true,
    supportsProtocols: true,
    supportsGuardrails: true,
    entryFormat: 'markdown',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere',
    entryFile: '.cursorrules',
    configDir: '.cursor',
    entryTemplate: 'cursor/.cursorrules.template',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'plaintext',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    vendor: 'Codeium',
    entryFile: '.windsurfrules',
    configDir: '.windsurf',
    entryTemplate: 'windsurf/.windsurfrules.template',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'plaintext',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    vendor: 'GitHub',
    entryFile: '.github/copilot-instructions.md',
    configDir: '.github',
    entryTemplate: 'copilot/copilot-instructions.template.md',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'markdown',
  },
  {
    id: 'trae',
    name: 'Trae',
    vendor: 'ByteDance',
    entryFile: '.trae/rules/project.md',
    configDir: '.trae',
    entryTemplate: 'trae/project.template.md',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'markdown',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    vendor: 'Moonshot AI',
    entryFile: 'AGENTS.md',
    configDir: '.agents',
    entryTemplate: 'kimi/AGENTS.entry.template.md',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'markdown',
  },
  {
    id: 'codex',
    name: 'Codex',
    vendor: 'OpenAI',
    entryFile: 'AGENTS.md',
    configDir: '.codex',
    entryTemplate: 'codex/AGENTS.entry.template.md',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'markdown',
  },
  {
    id: 'generic',
    name: '通用模式',
    vendor: '兼容所有 agent',
    entryFile: '',
    configDir: null,
    entryTemplate: '',
    supportsHooks: false,
    supportsSkills: false,
    supportsSettings: false,
    supportsProtocols: false,
    supportsGuardrails: false,
    entryFormat: 'markdown',
  },
]

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id)
}

export function getAgentOrThrow(id: string): AgentDefinition {
  const agent = getAgent(id)
  if (!agent) throw new Error(`未知的 agent: ${id}`)
  return agent
}

export function listAgentIds(): string[] {
  return AGENT_REGISTRY.map((a) => a.id)
}

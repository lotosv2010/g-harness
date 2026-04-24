// Agent 注册表：定义支持的 AI 开发助手及其配置格式

export interface AgentDefinition {
  id: string
  name: string
  vendor: string
  // 入口配置文件路径（相对项目根）
  entryFile: string
  // 规则/协议配置目录（相对项目根），null 表示无独立配置目录
  configDir: string | null
  // 入口模板文件名（src/templates/entries/ 下）
  entryTemplate: string
  // 能力标记
  supportsHooks: boolean
  supportsSkills: boolean
  supportsSettings: boolean
  supportsProtocols: boolean
  supportsGuardrails: boolean
  // 入口文件格式
  entryFormat: 'markdown' | 'plaintext'
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: 'claude',
    name: 'Claude Code',
    vendor: 'Anthropic',
    entryFile: 'CLAUDE.md',
    configDir: '.claude',
    entryTemplate: 'claude.template.md',
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
    entryTemplate: 'cursor.template.txt',
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
    entryTemplate: 'windsurf.template.txt',
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
    entryTemplate: 'copilot.template.md',
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
    entryTemplate: 'trae.template.md',
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
    entryTemplate: '',
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
    entryTemplate: '',
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

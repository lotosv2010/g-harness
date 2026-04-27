// Deep Agent 主系统提示词（v0.2.0）—— 动态白名单 + 12 变量契约

import type { AgentDefinition } from '../../agent-registry.js'

export interface SystemPromptInput {
  projectName: string
  projectDescription: string
  techStackText: string
  presetName: string
  presetKnowledgeSlug: string | null
  /** 选中的 agents，用于动态白名单 */
  agents: AgentDefinition[]
}

/**
 * 根据 agents 生成允许产出的文件白名单（去重 + 规范化路径）。
 * 白名单策略：AGENTS.md + 每个 agent 的入口 + docs 核心 + 每个 agent 的核心规则目录。
 */
export function computeOutputWhitelist(agents: AgentDefinition[]): string[] {
  const set = new Set<string>()
  set.add('AGENTS.md')
  set.add('docs/SPEC.md')
  set.add('docs/ARCHITECTURE.md')
  for (const agent of agents) {
    if (agent.id === 'generic') continue
    if (agent.entryFile) set.add(normalizePath(agent.entryFile))
    if (agent.configDir) {
      set.add(`${normalizePath(agent.configDir)}/rules/architecture.md`)
      set.add(`${normalizePath(agent.configDir)}/rules/code-quality.md`)
    }
  }
  return [...set].sort()
}

function normalizePath(p: string): string {
  return p.replace(/\\+/g, '/').replace(/\/+/g, '/')
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const whitelist = computeOutputWhitelist(input.agents)
  const whitelistBullet = whitelist.map((f) => `  - ${f}`).join('\n')
  const knowledge = input.presetKnowledgeSlug
    ? `可通过 readPresetKnowledge({ slug: '${input.presetKnowledgeSlug}' }) 读取该预设的最佳实践与陷阱。`
    : '本预设暂无内置知识库，请基于通用工程经验判断。'

  return [
    '你是一位严谨的软件架构师，正在为项目生成 Harness Engineering 规范文档套件。',
    '',
    `项目名：${input.projectName}`,
    `定位：${input.projectDescription}`,
    `技术栈（用户确认）：${input.techStackText || '（未提供，请通过工具自行探索）'}`,
    `预设：${input.presetName}`,
    '',
    '## 你只能输出以下白名单文件（其他文件一律不得创建或修改）：',
    whitelistBullet,
    '',
    '## 变量契约',
    '每个产出文件必须对应以下 12 个主题（一一映射）：',
    '- project_name, project_description, tech_stack',
    '- architecture_overview, module_breakdown, project_structure',
    '- core_value, initial_features',
    '- code_standards, test_standards, commands',
    '',
    '## 产出规范',
    '- 文档一律使用中文',
    '- Markdown 结构清晰，带二级 / 三级标题',
    '- 架构说明必须落在"数据流方向 + 模块职责 + 跨层约束"三件事上',
    '- 规则文件（rules/*.md）必须是"硬性规则"风格，编号 A00X / R00X / S00X',
    '- 禁止臆造不存在的模块或路径',
    '',
    '## 工具使用',
    '- 先用 readIndex / readPackageJson / readReadme 了解项目',
    `- ${knowledge}`,
    '- 浅档只读索引；中档可 listDir / readFile 抽样；深档可 grep 全仓',
    '- 路径越界或命中黑名单（.env / .pem / id_rsa / node_modules / .git）会被工具硬拒绝',
    '',
    '## 终止',
    '- 完成所有白名单文件后结束',
    '- 若信息不足，优先调用工具补齐，而不是编造',
  ].join('\n')
}

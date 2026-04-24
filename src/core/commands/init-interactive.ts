// init 交互式流程：Agent 选择 + 预设选择

import * as p from '@clack/prompts'
import pc from 'picocolors'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import type { AgentDefinition } from '../agents/agent-registry.js'

interface InteractiveResult {
  agents: AgentDefinition[]
  cancelled: boolean
}

// Agent 能力描述（用于交互提示的 hint）
function agentHint(agent: AgentDefinition): string {
  const caps: string[] = []
  if (agent.supportsHooks) caps.push('钩子')
  if (agent.supportsSkills) caps.push('技能')
  if (agent.supportsProtocols) caps.push('协议')
  if (agent.supportsGuardrails) caps.push('护栏')
  if (caps.length > 0) return `完整支持（规则/${caps.join('/')}）`
  if (agent.id === 'generic') return '仅生成 AGENTS.md，兼容所有 agent'
  return '支持规则'
}

export async function selectAgents(): Promise<InteractiveResult> {
  const options = AGENT_REGISTRY.map((agent) => ({
    value: agent.id,
    label: `${agent.name}（${agent.vendor}）`,
    hint: agentHint(agent),
  }))

  const selected = await p.multiselect({
    message: '选择你的 AI 开发助手（空格选择，回车确认）',
    options,
    initialValues: ['claude'],
    required: true,
  })

  if (p.isCancel(selected)) {
    p.cancel('已取消')
    return { agents: [], cancelled: true }
  }

  const agents = (selected as string[]).map((id) => {
    const agent = AGENT_REGISTRY.find((a) => a.id === id)
    if (!agent) throw new Error(`未知 agent: ${id}`)
    return agent
  })

  return { agents, cancelled: false }
}

export function printAgentSummary(agents: AgentDefinition[]): void {
  const names = agents.map((a) => a.name).join(', ')
  console.log(pc.cyan(`AI 助手: ${names}`))

  // 提示非 Claude 的 agent 功能受限
  const limited = agents.filter((a) => a.id !== 'claude' && a.id !== 'generic')
  if (limited.length > 0) {
    const names = limited.map((a) => a.name).join('、')
    console.log(pc.dim(`提示: ${names} 仅支持规则文件，钩子/协议/技能等高级功能仅 Claude Code 可用`))
  }
}

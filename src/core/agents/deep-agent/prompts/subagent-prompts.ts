// 子 agent 提示词（v0.2.0）—— 仅两类：spec-writer、rules-writer

export interface SubAgentPrompt {
  name: string
  description: string
  prompt: string
}

export const SUBAGENTS: SubAgentPrompt[] = [
  {
    name: 'spec-writer',
    description: '产出 docs/SPEC.md、docs/ARCHITECTURE.md、AGENTS.md、以及所选 agent 的入口文件',
    prompt: [
      '你是规范文档作者。仅产出：docs/SPEC.md、docs/ARCHITECTURE.md、AGENTS.md，以及所选 agent 的入口文件。',
      '内容要求：',
      '- 围绕 12 变量契约组织',
      '- 架构说明含"分层 + 数据流方向 + 跨层约束"',
      '- SPEC 列出核心价值、至少 3 条初始功能条目、验收标准模板',
      '- 文档使用中文；禁止臆造未声明的模块或依赖',
    ].join('\n'),
  },
  {
    name: 'rules-writer',
    description: '产出每个所选 agent 的 <configDir>/rules/architecture.md 与 code-quality.md',
    prompt: [
      '你是规则作者。仅产出每个 agent 的 <configDir>/rules/architecture.md 和 code-quality.md。',
      '风格：硬性规则编号化（A001 / R001 / ...），每条规则一行，后跟简短理由。',
      '保持技术栈相关性：引用真实依赖、真实目录名；禁止泛泛而谈。',
    ].join('\n'),
  },
]

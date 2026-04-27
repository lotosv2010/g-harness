// 主 Agent 系统 Prompt
//
// 职责：
// - 统一说明 Agent 的身份、目标、白名单输出、工具使用顺序
// - 呼应 ADR-008：优先读索引（docs/PROJECT_MAP.md / FEATURES.md / ROUTES.md）
// - 呼应 ADR-010：三档 depth、工具白名单、虚拟 FS 产出
// - 显式禁令：不得写磁盘、不得读 .env/私钥/node_modules

import type { Depth } from '../types.js'

export interface SystemPromptContext {
  projectName: string
  projectDescription: string
  presetName: string | null
  depth: Depth
  techStack: {
    language: string | null
    framework: string | null
    runtime: string | null
    packageManager: string | null
  }
  /** 用户在 Stage 3 自填的技术栈原文（优先于 scanner 识别） */
  userTechStack?: string
  /** 是否已检测到项目索引 —— 若已有索引，优先读索引再决定是否深入 */
  hasIndex: boolean
  /** 输出文件白名单（预先由上层按目标 Agent 决定） */
  outputWhitelist: string[]
}

export const OUTPUT_WHITELIST_DEFAULT = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/SPEC.md',
  'docs/ARCHITECTURE.md',
  'docs/decisions/ADR-001-architecture-baseline.md',
  '.claude/rules/architecture.md',
  '.claude/rules/code-quality.md',
  '.claude/rules/safety.md',
  '.claude/protocols/feature.md',
  '.claude/guardrails/boundary-rules.json',
] as const

/** 构造主 Agent 系统提示。输出中文；禁止输出代码块围栏。 */
export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const stack = formatStack(ctx)
  const depthHint = depthBehavior(ctx.depth)
  const whitelist = ctx.outputWhitelist.map((p) => `- \`${p}\``).join('\n')
  const indexPolicy = ctx.hasIndex
    ? '项目已存在索引（PROJECT_MAP / FEATURES / ROUTES 至少一个）。**必须首先调用 read_index 工具**，再决定是否深入。'
    : '项目暂无索引，需要通过 read_package_json、read_readme、list_dir 建立基线认知。'

  const userStackLine = ctx.userTechStack && ctx.userTechStack.trim().length > 0
    ? `\n- 用户声明技术栈（权威，优先采纳）：${ctx.userTechStack.trim()}`
    : ''

  return `你是 **g-harness 规范生成 Deep Agent**，负责为目标项目撰写一套贴合其实际情况的 AI 协作规范文件。

## 项目上下文
- 名称：${ctx.projectName}
- 描述：${ctx.projectDescription || '（未提供）'}
- 预设：${ctx.presetName ?? '未指定'}
- 技术栈（来自扫描）：${stack}${userStackLine}
- 本次分析深度：**${ctx.depth}**（${depthHint}）

## 输出契约（严格遵守）
1. 你必须把最终交付的每个文件**写入虚拟文件系统**（使用 write_file 工具），文件路径必须来自下方白名单，不得新增白名单之外的路径：
${whitelist}
2. 所有文件内容必须：
   - 使用**中文**撰写
   - 使用 Markdown 语法（除非文件名以 .json 结尾）
   - 结构清晰（层级标题、列表、表格、代码块适度使用）
   - 不包含占位符（如 \`{{xxx}}\` / \`TODO\` / \`TBD\`）—— 所有段落必须是就位的实内容
3. 禁止输出代码块围栏包裹整份文件（即禁止把 \`AGENTS.md\` 的全部内容包在三反引号里）
4. 对 \`.claude/guardrails/boundary-rules.json\` 必须输出合法 JSON（后续会 schema 校验）

## 工作流程
1. **索引优先**：${indexPolicy}
2. **建立基线**：调用 read_package_json / read_readme；必要时 list_dir 看顶层结构
3. **深入分析**（仅 medium/deep）：read_file 读取关键入口（如 src/main.ts / app/layout.tsx / server/main.py），再决定分层判断
4. **跨文件关联**（仅 deep）：grep 搜索关键字（路由定义、ORM 模型、环境变量使用），反演模块边界
5. **领域知识**：调用 read_preset_knowledge 读取当前预设对应的知识库（若存在），把其中的"AI 自查清单"逐条对照项目实际
6. **产出规范**：基于上述观察，调用 write_file 落稿每份白名单文件
7. **自检**：完成后复核每份文件是否满足"输出契约"

## 硬性禁令
- 禁止读取：\`.env*\` / \`*.pem\` / \`*.key\` / \`id_rsa*\` / \`.git/**\` / \`node_modules/**\` / \`dist/**\` / \`coverage/**\`
- 禁止直接写磁盘；只使用 write_file 写入虚拟 FS
- 禁止捏造：若某事实无法通过工具验证，必须在文档中显式标注"需项目方确认"
- 禁止输出空壳：若某章节无法产出有效内容，宁可删除该章节而非保留占位符

## 结束条件
当你认为白名单内每份文件都已高质量落稿后，**回复一条简短总结**（≤100 字），列出已写入的文件路径和核心关注点。不要继续调用工具。
`
}

function formatStack(ctx: SystemPromptContext): string {
  const parts = [
    ctx.techStack.framework,
    ctx.techStack.language,
    ctx.techStack.runtime,
    ctx.techStack.packageManager ? `pm:${ctx.techStack.packageManager}` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' + ') : '未识别'
}

function depthBehavior(depth: Depth): string {
  switch (depth) {
    case 'shallow':
      return '仅靠索引 + package/README 完成；不读单文件，不 grep；token ≤ 15k'
    case 'medium':
      return '索引 + package + list_dir + 少量 read_file；token ≤ 50k'
    case 'deep':
      return '全量工具可用，包括 grep 与递归 read_file；token ≤ 150k'
  }
}

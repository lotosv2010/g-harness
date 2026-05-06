// 模板类别 + 子项定义：用户在 init 时逐类别选择安装哪些具体项

export interface CategoryItem {
  /** 子项标识符 */
  id: string
  /** 显示名称 */
  label: string
  /** 简短描述 */
  description: string
  /** 匹配 outputPath 的关键词（路径中包含即匹配） */
  pathMatch: string
  /** 是否默认选中 */
  defaultSelected: boolean
}

export interface TemplateCategory {
  /** 类别标识符 */
  id: string
  /** 显示名称 */
  label: string
  /** 简短描述 */
  description: string
  /** 匹配模板路径的前缀（outputPath 中出现即归属此类别） */
  pathPatterns: string[]
  /** 是否默认选中（整个类别） */
  defaultSelected: boolean
  /** 是否必选（不可跳过） */
  required: boolean
  /** 排序权重（小在前） */
  order: number
  /** 该类别下的可选子项（为空则整个类别视为整体，无二级选择） */
  items: CategoryItem[]
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'rules',
    label: '硬性规则（rules）',
    description: '架构、代码质量、安全约束 — 建议必装',
    pathPatterns: ['rules/'],
    defaultSelected: true,
    required: true,
    order: 1,
    items: [
      { id: 'architecture', label: '架构规则', description: '目录职责分离、测试放置等', pathMatch: 'rules/architecture', defaultSelected: true },
      { id: 'code-quality', label: '代码质量', description: '严格类型、命名导出、函数复杂度', pathMatch: 'rules/code-quality', defaultSelected: true },
      { id: 'safety', label: '安全约束', description: '敏感信息保护、破坏性操作确认', pathMatch: 'rules/safety', defaultSelected: true },
      { id: 'git', label: 'Git 规范', description: '分支策略、Commit 格式、合并规则', pathMatch: 'rules/git', defaultSelected: false },
      { id: 'dependency', label: '依赖管理', description: '引入标准、版本锁定、License 合规', pathMatch: 'rules/dependency', defaultSelected: false },
    ],
  },
  {
    id: 'protocols',
    label: '任务协议（protocols）',
    description: '功能开发、Bug 修复、重构等标准流程',
    pathPatterns: ['protocols/'],
    defaultSelected: true,
    required: false,
    order: 2,
    items: [
      { id: 'feature', label: '功能开发', description: '需求 → 设计 → 实现 → 验收', pathMatch: 'protocols/feature', defaultSelected: true },
      { id: 'bugfix', label: 'Bug 修复', description: '定位 → 修复 → 回归测试', pathMatch: 'protocols/bugfix', defaultSelected: true },
      { id: 'review', label: '代码审查', description: '正确性 → 架构 → 质量 → 测试 → 安全', pathMatch: 'protocols/review', defaultSelected: true },
      { id: 'refactor', label: '重构', description: '评估 → 方案 → 分步执行 → 验证', pathMatch: 'protocols/refactor', defaultSelected: false },
      { id: 'testing', label: '测试计划', description: '目标 → 分层 → 用例 → 实现 → 评审', pathMatch: 'protocols/testing', defaultSelected: false },
      { id: 'migration', label: '数据迁移', description: '影响分析 → 方案 → 实现 → 回滚验证', pathMatch: 'protocols/migration', defaultSelected: false },
      { id: 'incident', label: '事故响应', description: '止血 → 修复 → 验证 → 复盘', pathMatch: 'protocols/incident', defaultSelected: false },
      { id: 'hotfix', label: '紧急修复', description: '绕过常规流程的快速修复通道', pathMatch: 'protocols/hotfix', defaultSelected: false },
      { id: 'rollback', label: '回滚', description: '部署失败后的版本恢复流程', pathMatch: 'protocols/rollback', defaultSelected: false },
    ],
  },
  {
    id: 'skills',
    label: '可复用能力（skills）',
    description: '需求交付、测试生成、PR 等可调用技能',
    pathPatterns: ['skills/'],
    defaultSelected: true,
    required: false,
    order: 3,
    items: [
      { id: 'feat', label: '需求交付（feat）', description: '端到端需求分析 → ADR → 任务拆解 → 实现', pathMatch: 'skills/feat', defaultSelected: true },
      { id: 'test-gen', label: '测试生成（test-gen）', description: '为指定文件自动生成测试用例', pathMatch: 'skills/test-gen', defaultSelected: false },
      { id: 'pr', label: 'PR 描述（pr）', description: '从 git diff 生成结构化 PR 描述', pathMatch: 'skills/pr', defaultSelected: false },
      { id: 'release', label: '发版流程（release）', description: '版本号管理、CHANGELOG 生成、tag 发布', pathMatch: 'skills/release', defaultSelected: false },
      { id: 'scaffold', label: '脚手架（scaffold）', description: '按约定生成模块/组件/页面骨架代码', pathMatch: 'skills/scaffold', defaultSelected: false },
      { id: 'analyze', label: '架构分析（analyze）', description: '检查模块边界、复杂度、测试覆盖', pathMatch: 'skills/analyze', defaultSelected: false },
      { id: 'debt', label: '技术债识别（debt）', description: '扫描技术债并按 ROI 排序输出清理建议', pathMatch: 'skills/debt', defaultSelected: false },
      { id: 'security', label: '安全扫描（security）', description: '检查硬编码密钥、依赖漏洞、注入风险', pathMatch: 'skills/security', defaultSelected: false },
    ],
  },
  {
    id: 'guardrails',
    label: '自动约束（guardrails）',
    description: '提交前检查、边界校验规则',
    pathPatterns: ['guardrails/'],
    defaultSelected: true,
    required: false,
    order: 4,
    items: [
      { id: 'boundary-rules', label: '边界校验', description: '文件范围、权限边界约束', pathMatch: 'guardrails/boundary', defaultSelected: true },
      { id: 'pre-commit', label: '提交前检查', description: '提交前自动检查清单', pathMatch: 'guardrails/pre-commit', defaultSelected: true },
      { id: 'secret-scan', label: '敏感信息扫描', description: '密钥、Token、密码泄露检测', pathMatch: 'guardrails/secret-scan', defaultSelected: false },
      { id: 'file-size', label: '文件体积', description: '单文件行数和体积超限告警', pathMatch: 'guardrails/file-size', defaultSelected: false },
      { id: 'coverage-gate', label: '覆盖率门禁', description: '测试覆盖率阈值检查', pathMatch: 'guardrails/coverage-gate', defaultSelected: false },
    ],
  },
  {
    id: 'hooks',
    label: '事件钩子（hooks）',
    description: '生命周期事件拦截（PreToolUse/PostToolUse/Stop）',
    pathPatterns: ['hooks/'],
    defaultSelected: false,
    required: false,
    order: 5,
    items: [
      { id: 'pre-task', label: '任务开始前', description: '读取上下文、确认范围、环境检查', pathMatch: 'hooks/pre-task', defaultSelected: true },
      { id: 'post-task', label: '任务完成后', description: '更新看板、验证通过、生成摘要', pathMatch: 'hooks/post-task', defaultSelected: true },
      { id: 'pre-commit', label: '提交前', description: '类型检查、Lint、测试、敏感信息扫描', pathMatch: 'hooks/pre-commit', defaultSelected: true },
      { id: 'pre-merge', label: '合并前', description: 'CI 通过、Review 确认、冲突检查', pathMatch: 'hooks/pre-merge', defaultSelected: false },
      { id: 'pre-release', label: '发布前', description: '全量测试、版本号、Changelog', pathMatch: 'hooks/pre-release', defaultSelected: false },
      { id: 'post-deploy', label: '部署后', description: '健康检查、监控确认、通知', pathMatch: 'hooks/post-deploy', defaultSelected: false },
      { id: 'on-error', label: '错误时', description: '错误收集、影响评估、恢复建议', pathMatch: 'hooks/on-error', defaultSelected: false },
    ],
  },
  {
    id: 'docs',
    label: '规范文档（docs）',
    description: 'SPEC、ARCHITECTURE、ADR、任务看板',
    pathPatterns: ['docs/'],
    defaultSelected: true,
    required: false,
    order: 6,
    items: [
      { id: 'spec', label: '产品规格（SPEC）', description: '产品说明书 + 需求规格', pathMatch: 'docs/SPEC', defaultSelected: true },
      { id: 'architecture', label: '架构白皮书', description: '系统架构设计文档', pathMatch: 'docs/ARCHITECTURE', defaultSelected: true },
      { id: 'adr', label: '架构决策记录（ADR）', description: '关键决策及其背景', pathMatch: 'docs/decisions/', defaultSelected: true },
      { id: 'tasks', label: '任务看板', description: 'BOARD + CURRENT 任务追踪', pathMatch: 'docs/tasks/', defaultSelected: true },
      { id: 'design', label: '技术设计', description: '技术方案、UI 设计、性能设计', pathMatch: 'docs/DESIGN', defaultSelected: false },
      { id: 'api', label: 'API 契约', description: '接口定义、错误码、认证', pathMatch: 'docs/API', defaultSelected: false },
      { id: 'data-model', label: '数据模型', description: '实体定义、ER 关系、迁移记录', pathMatch: 'docs/DATA_MODEL', defaultSelected: false },
      { id: 'team', label: '团队分工', description: '角色定义、模块归属', pathMatch: 'docs/team/', defaultSelected: false },
      { id: 'runbooks', label: '操作手册', description: '部署、回滚、事故响应手册', pathMatch: 'docs/runbooks/', defaultSelected: false },
    ],
  },
  {
    id: 'prompts',
    label: 'AI Prompt 模板（prompts）',
    description: '功能开发、Bug 报告、代码审查、重构等结构化 Prompt',
    pathPatterns: ['prompts/'],
    defaultSelected: false,
    required: false,
    order: 7,
    items: [
      { id: 'feature-dev', label: '功能开发', description: '下达功能开发指令的结构化模板', pathMatch: 'prompts/feature-dev', defaultSelected: true },
      { id: 'bug-report', label: 'Bug 报告', description: '报告项目 Bug 的标准格式', pathMatch: 'prompts/bug-report', defaultSelected: true },
      { id: 'code-review', label: '代码审查', description: '请求审查代码变更的模板', pathMatch: 'prompts/code-review', defaultSelected: true },
      { id: 'refactor', label: '重构请求', description: '请求代码重构的模板', pathMatch: 'prompts/refactor', defaultSelected: false },
    ],
  },
  {
    id: 'agents-entry',
    label: '通用规范入口（AGENTS.md）',
    description: '面向所有 AI agent 的通用行为规范',
    pathPatterns: ['AGENTS.md'],
    defaultSelected: true,
    required: false,
    order: 8,
    items: [],
  },
]

// ─── 过滤逻辑 ────────────────────────────────────────────────────────────────

/** 用户选择结果：每个启用的类别对应其选中的子项 id 列表 */
export interface CategorySelectionMap {
  /** 启用的类别 id → 选中的子项 id 列表（空数组 = 全量安装） */
  [categoryId: string]: string[]
}

/** 判定一个文件路径属于哪个类别；不属于任何类别返回 null */
export function categorizeFile(outputPath: string): TemplateCategory | null {
  for (const cat of TEMPLATE_CATEGORIES) {
    for (const pattern of cat.pathPatterns) {
      if (outputPath.includes(pattern) || outputPath === pattern.replace(/\/$/, '')) {
        return cat
      }
    }
  }
  return null
}

/** 根据选择结果过滤模板文件 */
export function filterBySelection(
  files: { outputPath: string }[],
  selection: CategorySelectionMap,
): typeof files {
  return files.filter((f) => {
    const cat = categorizeFile(f.outputPath)
    if (!cat) return true // 无类别归属的文件（如 entry 文件）放行

    // 类别未启用 → 排除
    if (!(cat.id in selection)) return false

    const selectedItems = selection[cat.id]
    // 空数组 = 全量安装（该类别无子项或用户全选）
    if (selectedItems.length === 0) return true

    // 有子项选择：检查文件是否匹配任一选中子项
    const matchedItem = cat.items.find((item) =>
      selectedItems.includes(item.id) && f.outputPath.includes(item.pathMatch),
    )
    // 如果文件不匹配任何已知子项的 pathMatch（可能是类别下的通用文件），放行
    const belongsToAnyItem = cat.items.some((item) => f.outputPath.includes(item.pathMatch))
    if (!belongsToAnyItem) return true

    return !!matchedItem
  })
}

/** 获取所有默认选中的类别 id */
export function getDefaultCategoryIds(): string[] {
  return TEMPLATE_CATEGORIES.filter((c) => c.defaultSelected).map((c) => c.id)
}

/** 获取所有必选类别 id */
export function getRequiredCategoryIds(): string[] {
  return TEMPLATE_CATEGORIES.filter((c) => c.required).map((c) => c.id)
}

/** 构建默认全选的 SelectionMap */
export function buildDefaultSelection(): CategorySelectionMap {
  const map: CategorySelectionMap = {}
  for (const cat of TEMPLATE_CATEGORIES) {
    if (!cat.defaultSelected) continue
    map[cat.id] = cat.items.filter((i) => i.defaultSelected).map((i) => i.id)
  }
  return map
}

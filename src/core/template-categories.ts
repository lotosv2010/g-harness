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
    pathPatterns: ['.ai/rules/'],
    defaultSelected: true,
    required: true,
    order: 1,
    items: [
      { id: 'architecture', label: '架构规则', description: '目录职责分离、测试放置等', pathMatch: 'rules/architecture', defaultSelected: true },
      { id: 'code-quality', label: '代码质量', description: '严格类型、命名导出、函数复杂度', pathMatch: 'rules/code-quality', defaultSelected: true },
      { id: 'safety', label: '安全约束', description: '敏感信息保护、破坏性操作确认', pathMatch: 'rules/safety', defaultSelected: true },
    ],
  },
  {
    id: 'protocols',
    label: '任务协议（protocols）',
    description: '功能开发、Bug 修复、重构等标准流程',
    pathPatterns: ['.ai/protocols/'],
    defaultSelected: true,
    required: false,
    order: 2,
    items: [
      { id: 'feature', label: '功能开发', description: '需求 → 设计 → 实现 → 验收', pathMatch: 'protocols/feature', defaultSelected: true },
      { id: 'bugfix', label: 'Bug 修复', description: '定位 → 修复 → 回归测试', pathMatch: 'protocols/bugfix', defaultSelected: true },
      { id: 'review', label: '代码审查', description: '正确性 → 架构 → 质量 → 测试 → 安全', pathMatch: 'protocols/review', defaultSelected: true },
      { id: 'refactor', label: '重构', description: '评估 → 方案 → 分步执行 → 验证', pathMatch: 'protocols/refactor', defaultSelected: true },
      { id: 'testing', label: '测试计划', description: '目标 → 分层 → 用例 → 实现 → 评审', pathMatch: 'protocols/testing', defaultSelected: true },
      { id: 'migration', label: '数据迁移', description: '影响分析 → 方案 → 实现 → 回滚验证', pathMatch: 'protocols/migration', defaultSelected: false },
      { id: 'incident', label: '事故响应', description: '止血 → 修复 → 验证 → 复盘', pathMatch: 'protocols/incident', defaultSelected: false },
    ],
  },
  {
    id: 'skills',
    label: '可复用能力（skills）',
    description: '需求交付、测试生成、PR 等可调用技能',
    pathPatterns: ['.ai/skills/'],
    defaultSelected: true,
    required: false,
    order: 3,
    items: [
      { id: 'feat', label: '需求交付（feat）', description: '端到端需求分析 → ADR → 任务拆解 → 实现', pathMatch: 'skills/feat', defaultSelected: true },
      { id: 'test-gen', label: '测试生成（test-gen）', description: '为指定文件自动生成测试用例', pathMatch: 'skills/test-gen', defaultSelected: true },
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
    pathPatterns: ['.ai/guardrails/'],
    defaultSelected: true,
    required: false,
    order: 4,
    items: [
      { id: 'boundary-rules', label: '边界校验', description: '文件范围、权限边界约束', pathMatch: 'guardrails/boundary', defaultSelected: true },
      { id: 'pre-commit', label: '提交前检查', description: '提交前自动检查清单', pathMatch: 'guardrails/pre-commit', defaultSelected: true },
    ],
  },
  {
    id: 'hooks',
    label: '事件钩子（hooks）',
    description: '生命周期事件拦截（规划中 · v0.3）',
    pathPatterns: ['.ai/hooks/'],
    defaultSelected: false,
    required: false,
    order: 5,
    items: [],
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
    ],
  },
  {
    id: 'agents-entry',
    label: '通用规范入口（AGENTS.md）',
    description: '面向所有 AI agent 的通用行为规范',
    pathPatterns: ['AGENTS.md'],
    defaultSelected: true,
    required: false,
    order: 7,
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

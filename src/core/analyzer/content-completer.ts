// 内容补全器 — 根据描述分析结果生成 SPEC/ARCHITECTURE 的模板变量值

import type { DescriptionAnalysis, AppType } from './description-analyzer.js'
import type { ScanResult } from '../scanner/project-scanner.js'
import type { PresetFragment } from '../preset-loader.js'

export interface ContentCompletionInput {
  projectName: string
  projectDescription: string
  analysis: DescriptionAnalysis
  scanResult: ScanResult
  /** 预设片段库，用于覆盖/补充应用类型默认值 */
  presetFragment?: PresetFragment
}

export interface ContentCompletion {
  projectPositioning: string      // SPEC 1.1 产品定位
  coreValueTable: string          // SPEC 1.2 核心价值表
  productBoundaries: string       // SPEC 1.3 产品边界
  initialFeatures: string         // SPEC 2.1 FR-01 起点
  nfrHints: string                // SPEC 2.2 非功能建议
  architectureOverview: string    // ARCHITECTURE 1. 架构总览
  moduleBreakdown: string         // ARCHITECTURE 4. 模块划分
  projectStructureHint: string    // ARCHITECTURE 3. 项目结构提示
}

export function completeContent(input: ContentCompletionInput): ContentCompletion {
  const { projectName, projectDescription, analysis, scanResult, presetFragment } = input
  const desc = projectDescription?.trim() || `${projectName} 项目`

  // 预设片段优先覆盖 analyzer 推导的模块清单
  const effectiveAnalysis: DescriptionAnalysis = presetFragment?.defaultModules?.length
    ? { ...analysis, suggestedModules: mergeModules(presetFragment.defaultModules, analysis.suggestedModules) }
    : analysis

  return {
    projectPositioning: buildPositioning(projectName, desc, effectiveAnalysis),
    coreValueTable: buildCoreValueTable(effectiveAnalysis),
    productBoundaries: buildBoundaries(projectName, effectiveAnalysis),
    initialFeatures: buildInitialFeatures(effectiveAnalysis),
    nfrHints: buildNfrHints(effectiveAnalysis, presetFragment),
    architectureOverview: buildArchitectureOverview(desc, effectiveAnalysis, scanResult, presetFragment),
    moduleBreakdown: buildModuleBreakdown(effectiveAnalysis),
    projectStructureHint: buildStructureHint(effectiveAnalysis, scanResult, presetFragment),
  }
}

function mergeModules(primary: string[], secondary: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of [...primary, ...secondary]) {
    if (seen.has(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out
}

function buildPositioning(name: string, desc: string, a: DescriptionAnalysis): string {
  const appTypeLabel = appTypeLabelOf(a.appType)
  const domainLabel = a.domain ? `${a.domain}领域` : '通用业务'
  return `**${name}** 是一个${appTypeLabel}，定位于${domainLabel}。\n\n${desc}`
}

function buildCoreValueTable(a: DescriptionAnalysis): string {
  const rows: Array<[string, string]> = []

  if (a.features.length > 0) {
    for (const f of a.features.slice(0, 5)) {
      rows.push([f, `提供${f}相关能力，提升用户体验与业务效率`])
    }
  }

  if (rows.length === 0) {
    const hints = defaultValueRows(a.appType)
    rows.push(...hints)
  }

  const header = '| 价值 | 描述 |\n|------|------|'
  const body = rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')
  return `${header}\n${body}`
}

function defaultValueRows(appType: AppType): Array<[string, string]> {
  const map: Record<AppType, Array<[string, string]>> = {
    'web-app': [
      ['良好体验', '快速加载、响应式布局、无障碍访问'],
      ['可维护性', '组件化架构、类型安全、完善测试'],
    ],
    'api': [
      ['接口稳定', 'OpenAPI 规范、版本化、向后兼容'],
      ['性能可观测', '日志、追踪、指标齐备'],
    ],
    'fullstack': [
      ['前后端一体', '统一类型、SSR、流式渲染'],
      ['部署简化', '单一运行时，渐进式增强'],
    ],
    'mobile': [
      ['原生体验', '流畅交互、离线可用、推送通知'],
      ['跨平台一致', 'iOS/Android 行为统一'],
    ],
    'desktop': [
      ['本地能力', '文件系统、系统托盘、自动更新'],
      ['安全可控', '进程隔离、权限最小化'],
    ],
    'cli': [
      ['开发者效率', '清晰命令、完善帮助、可组合'],
      ['可靠性', '幂等、可重入、错误可恢复'],
    ],
    'library': [
      ['API 清晰', '命名一致、文档齐全、示例丰富'],
      ['无侵入', '零依赖、tree-shakable'],
    ],
    'unknown': [
      ['（请补充）', '（请补充）'],
    ],
  }
  return map[appType] ?? map.unknown
}

function buildBoundaries(name: string, a: DescriptionAnalysis): string {
  const isParts: string[] = []
  const isNotParts: string[] = []

  const appType = appTypeLabelOf(a.appType)
  isParts.push(`一个${appType}`)
  if (a.domain) isParts.push(`聚焦${a.domain}领域的业务系统`)
  if (a.features.length > 0) isParts.push(`提供 ${a.features.slice(0, 3).join('、')} 等核心能力`)

  // 根据应用类型明确排除项
  const exclusions: Record<AppType, string[]> = {
    'web-app': ['不是后端 API 框架', '不负责数据持久化'],
    'api': ['不包含前端 UI', '不是数据库'],
    'fullstack': ['不是通用业务中台', '不替代专业 BI/CRM'],
    'mobile': ['不是 Web 响应式方案', '不承担服务端逻辑'],
    'desktop': ['不是 Web 应用', '不承担服务端逻辑'],
    'cli': ['不是守护进程', '不替代 IDE'],
    'library': ['不是完整应用', '不绑定特定业务'],
    'unknown': ['（请补充）'],
  }
  isNotParts.push(...(exclusions[a.appType] ?? exclusions.unknown))

  const isList = isParts.map((s) => `- ${s}`).join('\n')
  const isNotList = isNotParts.map((s) => `- ${s}`).join('\n')

  return `**本项目是：**\n${isList}\n\n**本项目不是：**\n${isNotList}`
}

function buildInitialFeatures(a: DescriptionAnalysis): string {
  const features = a.features.length > 0 ? a.features : inferInitialFeatures(a.appType)
  if (features.length === 0) {
    return `#### FR-01：[功能名称]\n\n**优先级：** P0 / P1 / P2\n\n**描述：** （请补充功能描述）\n\n**验收标准：**\n- [ ] （请补充验收标准）`
  }
  return features.slice(0, 5).map((f, i) => {
    const id = `FR-${String(i + 1).padStart(2, '0')}`
    return `#### ${id}：${f}\n\n**优先级：** ${i === 0 ? 'P0' : 'P1'}\n\n**描述：** ${f}相关能力，覆盖业务所需场景。\n\n**验收标准：**\n- [ ] 核心路径可用\n- [ ] 异常路径可恢复\n- [ ] 关键指标被埋点`
  }).join('\n\n')
}

function inferInitialFeatures(appType: AppType): string[] {
  const map: Record<AppType, string[]> = {
    'web-app': ['页面渲染', '用户交互', '数据获取'],
    'api': ['资源 CRUD', '认证授权', '请求校验'],
    'fullstack': ['页面渲染', '服务端 API', '身份认证'],
    'mobile': ['页面导航', '本地存储', '远程同步'],
    'desktop': ['窗口管理', '系统集成', '持久化'],
    'cli': ['核心命令', '配置管理', '帮助与诊断'],
    'library': ['核心 API', '类型定义', '使用示例'],
    'unknown': [],
  }
  return map[appType] ?? []
}

function buildNfrHints(a: DescriptionAnalysis, fragment?: PresetFragment): string {
  const base = ['#### NFR-01：性能', '', '| 指标 | 目标值 |', '|------|--------|']

  const targets: Record<AppType, Array<[string, string]>> = {
    'web-app': [['首屏加载', '< 2s'], ['交互响应', '< 100ms']],
    'api': [['P99 延迟', '< 300ms'], ['吞吐', '> 500 QPS']],
    'fullstack': [['首屏加载', '< 2s'], ['API P99', '< 300ms']],
    'mobile': [['启动耗时', '< 2s'], ['帧率', '≥ 60fps']],
    'desktop': [['启动耗时', '< 3s'], ['内存占用', '< 300MB']],
    'cli': [['启动', '< 500ms'], ['命令响应', '< 1s']],
    'library': [['Bundle 体积', '按需载入'], ['无副作用', 'tree-shakable']],
    'unknown': [['（请补充）', '（请补充）']],
  }
  const rows = (targets[a.appType] ?? targets.unknown).map(([k, v]) => `| ${k} | ${v} |`)
  base.push(...rows)

  base.push('', '#### NFR-02：安全', '')
  base.push('- 所有数据传输使用 HTTPS')
  base.push('- 敏感数据加密存储')
  if (a.features.includes('身份认证')) base.push('- 会话过期与刷新策略明确')
  if (a.features.includes('支付集成')) base.push('- 支付回调签名校验，幂等处理')

  if (fragment?.extraNfr?.length) {
    base.push('')
    base.push('#### NFR-03：框架特定')
    base.push('')
    for (const item of fragment.extraNfr) base.push(`- ${item}`)
  }

  return base.join('\n')
}

function buildArchitectureOverview(
  desc: string,
  a: DescriptionAnalysis,
  scan: ScanResult,
  fragment?: PresetFragment,
): string {
  const { framework, language } = scan.techStack

  let layers: string
  if (fragment?.architectureLayers) {
    layers = fragment.architectureLayers
  } else {
    const layerMap: Record<AppType, string> = {
      'web-app': '**分层：** 页面层 → 组件层 → 数据层 → 工具层',
      'api': '**分层：** 路由层 → 控制器 → 服务层 → 数据访问层',
      'fullstack': '**分层：** 页面 → API 路由 → 服务层 → 数据层',
      'mobile': '**分层：** 页面 → 导航 → 状态管理 → 数据层',
      'desktop': '**分层：** 渲染进程 ↔ IPC ↔ 主进程 → 系统 API',
      'cli': '**分层：** 命令入口 → 核心逻辑 → 工具函数',
      'library': '**分层：** 公共 API → 内部实现 → 工具函数',
      'unknown': '**分层：** 待补充',
    }
    layers = layerMap[a.appType] ?? layerMap.unknown
  }

  const stack = [framework, language].filter(Boolean).join(' + ') || '（请补充）'
  return `${desc}\n\n${layers}\n\n**技术栈：** ${stack}`
}

function buildModuleBreakdown(a: DescriptionAnalysis): string {
  const modules = a.suggestedModules
  if (modules.length === 0) {
    return `### 4.1 [模块名]\n\n- **职责**：（请补充）\n- **公共 API**：（请补充入口文件导出）\n- **依赖方向**：（请说明允许依赖哪些模块）`
  }
  return modules.map((m, i) => {
    const id = `4.${i + 1}`
    return `### ${id} ${m}\n\n- **职责**：${moduleResponsibility(m)}\n- **公共 API**：通过 \`${m}/index.ts\` 导出\n- **依赖方向**：仅依赖 \`utils\` / \`types\` 等基础模块`
  }).join('\n\n')
}

function moduleResponsibility(module: string): string {
  const map: Record<string, string> = {
    product: '商品数据模型、列表与详情',
    order: '订单创建、状态流转、查询',
    cart: '购物车增删改、价格计算',
    user: '用户信息、资料管理',
    payment: '支付发起、回调、对账',
    auth: '身份认证、令牌签发与校验',
    role: '角色定义与分配',
    permission: '权限点定义与校验',
    tenant: '租户隔离、配置管理',
    subscription: '订阅计划、续费、变更',
    billing: '账单生成、支付、发票',
    post: '内容发布、编辑、审核',
    comment: '评论发布、回复、审核',
    message: '消息收发、已读状态',
    metric: '指标采集与存储',
    report: '报表定义与渲染',
    task: '任务创建、分派、状态流转',
    project: '项目容器、成员、权限',
    controller: '请求入口与参数校验',
    service: '核心业务逻辑',
    repository: '数据持久化访问',
    middleware: '请求管道：认证、日志、限流',
    pages: '页面路由与布局',
    components: 'UI 组件库',
    hooks: '可复用逻辑封装',
    services: '远程数据访问与缓存',
    utils: '通用工具函数',
    screens: '屏幕级页面',
    navigation: '导航配置与跳转',
    main: '主进程入口与生命周期',
    renderer: '渲染进程 UI',
    preload: '渲染进程可访问的桥接 API',
    ipc: '主 ↔ 渲染进程通信',
    core: '核心引擎实现',
    command: '命令定义与执行',
    config: '配置加载与校验',
    logger: '日志系统',
    api: '服务端 API 路由',
    lib: '共享库函数',
  }
  return map[module] ?? '（请补充职责说明）'
}

function buildStructureHint(
  a: DescriptionAnalysis,
  scan: ScanResult,
  fragment?: PresetFragment,
): string {
  if (fragment?.structureHint) return fragment.structureHint
  const src = scan.structure.srcDir ?? 'src'
  const modules = a.suggestedModules
  if (modules.length === 0) {
    return '（请根据项目实际目录结构补充）'
  }
  const tree = modules.map((m) => `│   ├── ${m}/`).join('\n')
  return `${src}/\n${tree}\n│   └── index.ts`
}

function appTypeLabelOf(t: AppType): string {
  const map: Record<AppType, string> = {
    'web-app': 'Web 应用',
    'api': '后端 API 服务',
    'fullstack': '全栈应用',
    'mobile': '移动端应用',
    'desktop': '桌面应用',
    'cli': '命令行工具',
    'library': '可复用库',
    'unknown': '软件项目',
  }
  return map[t]
}

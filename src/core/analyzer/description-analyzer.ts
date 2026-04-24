// 描述分析器 — 基于规则从项目描述中提取关键词、应用类型、候选模块
// 不依赖 LLM，确定性 + 可测试

export type AppType = 'web-app' | 'api' | 'fullstack' | 'mobile' | 'desktop' | 'cli' | 'library' | 'unknown'

export interface DescriptionAnalysis {
  appType: AppType
  domain: string | null
  keywords: string[]
  features: string[]
  suggestedModules: string[]
}

interface DomainRule {
  domain: string
  keywords: string[]
  modules: string[]
}

const DOMAIN_RULES: DomainRule[] = [
  {
    domain: '电商',
    keywords: ['电商', '商城', '商品', '订单', '购物', '支付', 'shop', 'ecommerce', 'cart', 'checkout'],
    modules: ['product', 'order', 'cart', 'user', 'payment'],
  },
  {
    domain: '后台管理',
    keywords: ['后台', '管理', '运营', '控制台', 'admin', 'dashboard', 'console', 'cms'],
    modules: ['auth', 'user', 'role', 'permission', 'audit-log'],
  },
  {
    domain: 'SaaS',
    keywords: ['saas', '多租户', 'tenant', 'workspace', '订阅'],
    modules: ['tenant', 'workspace', 'subscription', 'billing', 'user'],
  },
  {
    domain: '内容平台',
    keywords: ['博客', 'blog', '文章', '内容', '社区', 'forum', 'cms'],
    modules: ['post', 'author', 'comment', 'category', 'tag'],
  },
  {
    domain: '社交',
    keywords: ['社交', '聊天', 'chat', 'message', '好友', 'follow', 'feed'],
    modules: ['user', 'message', 'friend', 'feed', 'notification'],
  },
  {
    domain: '数据分析',
    keywords: ['数据分析', '报表', 'bi', 'analytics', '可视化', 'dashboard', '监控'],
    modules: ['metric', 'report', 'chart', 'query-engine', 'data-source'],
  },
  {
    domain: '任务协作',
    keywords: ['任务', '协作', '项目管理', 'task', 'project', 'workflow', 'ticket'],
    modules: ['project', 'task', 'member', 'workflow', 'notification'],
  },
  {
    domain: '工具',
    keywords: ['工具', 'tool', 'utility', 'cli', '脚本'],
    modules: ['core', 'command', 'config', 'logger'],
  },
]

const FEATURE_KEYWORDS: Array<[string, string]> = [
  ['权限', '权限控制'],
  ['角色', '角色管理'],
  ['role', '角色管理'],
  ['认证', '身份认证'],
  ['登录', '身份认证'],
  ['auth', '身份认证'],
  ['支付', '支付集成'],
  ['payment', '支付集成'],
  ['通知', '消息通知'],
  ['notification', '消息通知'],
  ['实时', '实时通信'],
  ['websocket', '实时通信'],
  ['搜索', '搜索能力'],
  ['search', '搜索能力'],
  ['导出', '数据导入导出'],
  ['导入', '数据导入导出'],
  ['export', '数据导入导出'],
  ['审核', '审核流程'],
  ['audit', '审计日志'],
  ['多语言', '国际化'],
  ['i18n', '国际化'],
  ['国际化', '国际化'],
  ['支付宝', '第三方支付'],
  ['微信', '微信生态集成'],
  ['openapi', 'OpenAPI 文档'],
  ['graphql', 'GraphQL 支持'],
  ['上传', '文件上传'],
  ['upload', '文件上传'],
]

export interface AppTypeHint {
  framework?: string | null
  runtime?: string | null
}

export function analyzeDescription(
  description: string,
  hint: AppTypeHint = {},
): DescriptionAnalysis {
  const text = (description || '').toLowerCase().trim()

  if (!text) {
    return {
      appType: inferAppTypeFromHint(hint),
      domain: null,
      keywords: [],
      features: [],
      suggestedModules: [],
    }
  }

  const domain = matchDomain(text)
  const features = extractFeatures(text)
  const keywords = extractKeywords(text)
  const appType = inferAppType(text, hint)
  const suggestedModules = domain?.modules ?? defaultModulesFor(appType)

  return {
    appType,
    domain: domain?.domain ?? null,
    keywords,
    features,
    suggestedModules,
  }
}

function matchDomain(text: string): DomainRule | null {
  let best: { rule: DomainRule; hits: number } | null = null
  for (const rule of DOMAIN_RULES) {
    const hits = rule.keywords.filter((k) => text.includes(k.toLowerCase())).length
    if (hits > 0 && (!best || hits > best.hits)) {
      best = { rule, hits }
    }
  }
  return best?.rule ?? null
}

function extractFeatures(text: string): string[] {
  const found = new Set<string>()
  for (const [keyword, feature] of FEATURE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      found.add(feature)
    }
  }
  return [...found]
}

function extractKeywords(text: string): string[] {
  // 提取中文词（2-6 个字符）和英文词（3+ 字符）
  const zhWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) ?? []
  const enWords = text.match(/[a-z]{3,}/g) ?? []
  const stopwords = new Set(['the', 'and', 'for', 'with', '支持', '一个', '系统', '平台', '项目'])
  const merged = [...zhWords, ...enWords].filter((w) => !stopwords.has(w))
  return [...new Set(merged)].slice(0, 10)
}

function inferAppType(text: string, hint: AppTypeHint): AppType {
  // 基于描述关键词优先判断
  if (/\bapi\b|后端|服务端|接口|微服务/.test(text)) {
    return /前端|全栈|fullstack|管理台|dashboard|界面/.test(text) ? 'fullstack' : 'api'
  }
  if (/移动端|app|android|ios|react native|flutter/.test(text)) return 'mobile'
  if (/桌面|desktop|electron|tauri/.test(text)) return 'desktop'
  if (/命令行|cli|scaffold|工具|脚本/.test(text)) return 'cli'
  if (/库|sdk|library|组件库/.test(text)) return 'library'
  if (/网站|前端|页面|web|后台|管理|saas/.test(text)) return 'web-app'
  return inferAppTypeFromHint(hint)
}

function inferAppTypeFromHint(hint: AppTypeHint): AppType {
  const fw = (hint.framework ?? '').toLowerCase()
  if (!fw) return 'unknown'
  if (['next.js', 'nuxt'].includes(fw)) return 'fullstack'
  if (['react', 'vue', 'angular', 'svelte'].includes(fw)) return 'web-app'
  if (['nestjs', 'express', 'hono', 'fastify'].includes(fw)) return 'api'
  if (['react native', 'flutter'].includes(fw)) return 'mobile'
  if (['electron', 'tauri'].includes(fw)) return 'desktop'
  return 'unknown'
}

function defaultModulesFor(appType: AppType): string[] {
  const map: Record<AppType, string[]> = {
    'web-app': ['pages', 'components', 'hooks', 'services', 'utils'],
    'api': ['controller', 'service', 'repository', 'middleware', 'config'],
    'fullstack': ['pages', 'api', 'components', 'services', 'lib'],
    'mobile': ['screens', 'components', 'navigation', 'services', 'utils'],
    'desktop': ['main', 'renderer', 'preload', 'ipc', 'utils'],
    'cli': ['commands', 'core', 'config', 'utils'],
    'library': ['core', 'utils', 'types'],
    'unknown': [],
  }
  return map[appType] ?? []
}

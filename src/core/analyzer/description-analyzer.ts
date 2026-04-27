// 描述关键词分析：从 project_description 推导应用类型，辅助 content-completer

export type AppType =
  | 'frontend-spa'
  | 'frontend-ssr'
  | 'mobile'
  | 'desktop'
  | 'backend-api'
  | 'cli'
  | 'library'
  | 'monorepo'
  | 'unknown'

export interface DescriptionAnalysis {
  appType: AppType
  keywords: string[]
}

const KEYWORD_MAP: Array<[RegExp, AppType]> = [
  [/单页|spa|dashboard|后台|管理端/i, 'frontend-spa'],
  [/ssr|next|nuxt|同构|服务端渲染/i, 'frontend-ssr'],
  [/移动|app|ios|android|小程序|flutter|react native|uni-app/i, 'mobile'],
  [/桌面|desktop|electron|tauri/i, 'desktop'],
  [/接口|api|服务|microservice|rest|graphql|后端/i, 'backend-api'],
  [/cli|命令行|工具|脚手架/i, 'cli'],
  [/库|library|sdk|组件库/i, 'library'],
  [/monorepo|多包|工作区/i, 'monorepo'],
]

export function analyzeDescription(description: string): DescriptionAnalysis {
  if (!description.trim()) return { appType: 'unknown', keywords: [] }
  const keywords: string[] = []
  let appType: AppType = 'unknown'
  for (const [pattern, type] of KEYWORD_MAP) {
    const match = description.match(pattern)
    if (match) {
      keywords.push(match[0])
      if (appType === 'unknown') appType = type
    }
  }
  return { appType, keywords }
}

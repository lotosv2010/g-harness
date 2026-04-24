// 项目索引类型定义

export interface RouteEntry {
  path: string                // "/api/users/:id"
  method?: string             // "GET" | "POST" | ...（仅 API 框架）
  file: string                // 相对路径
  line?: number
  handler?: string            // 函数/组件名
  framework: RouteFramework
}

export type RouteFramework =
  | 'next-app-router'
  | 'next-pages-router'
  | 'nuxt'
  | 'react-router'
  | 'vue-router'
  | 'express'
  | 'unknown'

export interface ModuleEntry {
  name: string
  path: string                // 相对路径（目录或文件）
  entry?: string              // 入口文件
  exports: string[]           // 导出的符号
  files: string[]             // 该模块包含的文件数
  kind: ModuleKind
}

export type ModuleKind = 'feature' | 'shared' | 'component' | 'service' | 'util' | 'unknown'

export interface FeatureEntry {
  name: string                // 从模块名或目录名推断
  entry: string               // 主入口文件
  relatedFiles: string[]      // 相关文件
  status: 'active' | 'unknown'
}

export interface ProjectIndex {
  generatedAt: string
  rootDir: string
  modules: ModuleEntry[]
  routes: RouteEntry[]
  features: FeatureEntry[]
}

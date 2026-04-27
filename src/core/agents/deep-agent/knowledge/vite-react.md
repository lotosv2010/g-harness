# Vite + React 知识库（Deep Agent 用）

## 推荐分层
- Pages（路由） → Features（业务模块） → Components（纯 UI） → Hooks → Shared
- 状态管理：feature 内部用 useState + 自定义 hook；跨 feature 共享优先 Zustand / Jotai

## 常见陷阱
- 在组件文件里混写 API 调用 → 应抽到 `features/<name>/api.ts`
- useEffect 滥用做初始化数据 → 优先用 React Query / SWR
- 默认导出多层嵌套 → 强制命名导出便于重构

## 非功能性
- 路由级 React.lazy + Suspense
- 图片用 `loading="lazy"` + 合适 `srcset`
- Tree-shakeable 依赖选择（lodash-es 而非 lodash）

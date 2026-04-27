# Nuxt 3 知识库

## 推荐分层
- `pages/` 路由；`components/` 自动导入；`composables/` 业务钩子；`server/api/` 后端；`utils/` 纯工具

## 关键约束
- 使用自动导入 API（useFetch / useState / useAsyncData）
- `server/` 与前端代码严格隔离，禁止共享运行时状态
- 避免在 setup 顶层使用 `await fetch()`，改用 `useFetch`

## 常见陷阱
- 在 SSR 场景下直接访问 window / document 引发 hydration mismatch
- middleware 误用为 API 鉴权 → 应区分 route middleware 与 server middleware

# App Router 架构规则

> Next.js App Router 专用的架构与代码组织规则，补充 `nextjs-specific.md`。

---

## APP001：目录即路由

- `app/` 目录下**只**放路由相关文件（`page`/`layout`/`loading`/`error`/`route`）
- 业务组件放 `src/features/<domain>/components/`
- 共享 UI 放 `src/components/`
- 禁止在 `app/` 目录直接放置 Hook、工具函数、类型定义

## APP002：路由分组与并行路由

- 使用 `(group)/` 做路由分组（不影响 URL），例如 `(dashboard)/`、`(public)/`
- 并行路由 `@slot` 仅在需要同时渲染多区域时使用
- 拦截路由 `(.)foo` 仅用于 Modal 等特定交互模式
- 不滥用高级路由特性，优先选择简单方案

## APP003：Layout 层级

- 根 Layout（`app/layout.tsx`）必须包含 `<html>` 与 `<body>`
- Layout 组件必须是 Server Component（除非有明确需求）
- 共享状态跨 Layout 时，使用 URL / Cookie / 服务端上下文，避免客户端全局状态
- 禁止在 Layout 中放置业务数据获取逻辑（应在具体 `page.tsx` 中）

## APP004：Server Actions

- 表单提交优先使用 Server Action（`'use server'`）
- Server Action 文件集中在 `src/app/_actions/` 或 `src/features/<domain>/actions.ts`
- Server Action 内部必须校验权限与输入（`zod` / `class-validator`）
- 敏感操作 Server Action 必须做 CSRF 防护或额外鉴权

## APP005：Route Handlers

- `app/api/**/route.ts` 仅用于第三方回调、Webhook、SSE/流式响应
- 内部数据操作优先使用 Server Component 直连或 Server Action
- Route Handler 必须使用 Web 标准 `Request`/`Response`
- 错误响应必须统一格式（含 `error.code` + `error.message`）

## APP006：Metadata 与 SEO

- 静态 metadata 导出 `metadata` 常量
- 动态 metadata 使用 `generateMetadata` 函数
- 禁止手动写 `<head>` 或使用 `next/head`（Pages Router 遗留）
- OG image 使用 `opengraph-image.tsx` 约定

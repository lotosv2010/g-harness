# Next.js App Router 知识库

## 推荐分层
- `app/` 路由与布局；`features/` 业务切片；`components/` UI；`lib/` 纯工具；`server-actions/`

## 关键约束
- 默认 Server Component；需要交互才加 `'use client'`
- 数据获取优先 RSC + fetch + Next cache 标签（force-cache / no-store / revalidate）
- Server Actions 是主要变更入口，禁止在 Client 直连数据库

## 常见陷阱
- 在 Client Component 中 import Node 原生模块 → 会打进 bundle
- Dynamic Route + cache 混用导致 revalidate 不生效
- 大量 `'use client'` 污染 → 逐层上提隔离边界

## 性能
- 用 `loading.tsx` + Streaming SSR 改善 TTFB
- 图片用 `next/image` 并声明 `priority` / `sizes`

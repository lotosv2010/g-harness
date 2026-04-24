# Next.js 特定规则

> 适用于 Next.js App Router 项目的额外规则，补充通用规则。

---

## NX001：路由与页面

- 使用 App Router（`app/` 目录），禁止 Pages Router
- 页面组件使用 `export default`（Next.js 约定），其他模块使用命名导出
- 动态路由使用 `[param]` 目录命名，Catch-all 使用 `[...slug]`
- 每个路由段可包含 `page.tsx`、`layout.tsx`、`loading.tsx`、`error.tsx`
- 禁止在 `app/` 目录中放置非路由文件，业务逻辑放 `src/features/` 或 `src/lib/`

## NX002：Server Component 与 Client Component

- 组件默认为 Server Component，仅在需要浏览器 API 或交互时添加 `'use client'`
- `'use client'` 声明放在文件第一行，且尽量下推到最小组件粒度
- Server Component 中可以直接 `async/await` 获取数据，禁止使用 `useEffect` 获取数据
- Client Component 中禁止直接访问数据库、文件系统等服务端资源
- 跨越 Server/Client 边界传递的 Props 必须可序列化（无函数、无 class 实例）

## NX003：数据获取

- 服务端数据获取使用 `fetch`（内置缓存）或 Server Actions
- 表单提交使用 Server Actions（`'use server'`），不手动写 API Route
- API Route（`app/api/`）仅用于第三方 Webhook、外部服务回调等场景
- 使用 `revalidatePath` / `revalidateTag` 管理缓存失效，禁止手动清除整站缓存
- 客户端数据获取使用 SWR / React Query，禁止裸 `useEffect` + `fetch`

## NX004：性能

- 图片使用 `<Image>` 组件（`next/image`），禁止裸 `<img>` 标签
- 链接使用 `<Link>` 组件（`next/link`），禁止裸 `<a>` 标签做内部导航
- 字体使用 `next/font`，禁止外部 CDN 引入字体
- 动态导入使用 `next/dynamic`，配合 `{ ssr: false }` 跳过服务端渲染
- Metadata 使用 `generateMetadata` 或 `metadata` 导出，禁止手动操作 `<head>`

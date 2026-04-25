# Vite + React 预设知识库

> 供 Deep Agent 生成规范文件时参考的 Vite + React 领域知识。
> 版本取向：Vite 5+ / React 18/19；SPA 或 MPA；非 SSR。

## 技术栈定位

Vite + React 是最常见的 SPA 组合：Vite 负责开发/构建（esbuild + Rollup），React 负责 UI。和 Next.js 的关键差异：无内置路由、无服务端渲染、无 API 层，所有业务行为都在浏览器完成，后端独立。

**典型心智模型**：
- 开发 = 原生 ESM 直出；构建 = Rollup 打包
- React Router（数据路由 v6.4+）或 TanStack Router 承担路由
- 客户端状态：Zustand / Jotai / Redux Toolkit + RTK Query；服务器状态 TanStack Query
- 与后端的契约由 OpenAPI / GraphQL codegen 定义

## 标准分层

```
src/
├── main.tsx                    # 挂载根组件
├── App.tsx                     # 路由/provider 组装
├── routes/                     # 路由定义（React Router / TanStack）
│   ├── index.tsx
│   └── users/$id.tsx
├── pages/                      # 页面级组件（与 routes 一一对应）
├── features/                   # 按领域切分
│   └── orders/
│       ├── components/
│       ├── hooks/
│       ├── api/                # TanStack Query / RTK Query 定义
│       ├── types.ts
│       └── schema.ts           # Zod
├── components/
│   ├── ui/                     # 原子组件
│   └── layout/                 # Header/Sidebar/PageShell
├── hooks/                      # 跨 feature 可复用 hook
├── lib/
│   ├── api-client.ts           # axios/fetch 封装 + 拦截器
│   ├── env.ts                  # import.meta.env 的 Zod 校验
│   ├── storage.ts              # localStorage 封装
│   └── utils.ts
├── stores/                     # 全局状态（Zustand slice / Redux slice）
├── styles/                     # Tailwind / CSS vars
├── types/                      # 共享类型 / OpenAPI 生成产物
└── test/                       # 测试工具、MSW handlers
```

**关键边界**：
- `features/*/api/` 是与后端通讯的唯一入口；组件不得直接 fetch
- `components/ui/` 纯 UI，不依赖 feature；`components/layout/` 可依赖路由但不依赖 feature
- `stores/` 最小化；能用 URL / Query state 就不用全局状态
- `lib/` 被任何层引用，但 `lib/` 不引用 `features/`

## 路由与数据

- **React Router v6.4+**：`loader` / `action` 把"数据请求 + 表单提交"纳入路由；loader 在 navigation 时触发
- **TanStack Router**：文件约定路由 + 类型安全 search params；更现代但生态稍小
- **数据获取**：TanStack Query 是 SPA 的事实标准，配合 Suspense 模式；RTK Query 适合已用 Redux 的团队

## 构建与性能

- `vite.config.ts`：`build.rollupOptions.output.manualChunks` 划分 vendor / feature / shared
- 路由懒加载：`React.lazy` + `<Suspense>` 或路由库原生支持
- `vite-plugin-visualizer` 分析 bundle；接入 CI 做阈值告警
- 图片：`vite-imagetools` + `<img srcset>`；避免 `import img from 'x.png'` 直接 inline 大图
- 环境变量：只有 `VITE_*` 前缀被暴露；其他忽略

## 常见陷阱

1. **默认无 CSRF/Session**：完全 token 模式；Cookie 模式需手动 `credentials: 'include'` + CORS
2. **路由守卫分散**：没有中间件概念；权限应包装为 `<RequireAuth>` 高阶组件或路由 loader 统一拦截
3. **import.meta.env 类型**：默认 `string | undefined`，必须通过 Zod schema 收敛
4. **vite build 产物过大**：未按路由分 chunk；全量 lodash / moment 未 treeshake
5. **React StrictMode 双调用**：开发时 useEffect 跑两次，副作用需幂等
6. **HMR 断连**：某些 class 状态在 HMR 后丢失；避免在 module top level 持有状态
7. **SSR 迁移成本**：Vite SSR 原生支持但无 Next.js 级便利；需要时优先评估迁移成本

## 推荐 rules

- **R-VR-01**：组件必须函数式 + TypeScript；禁止 class 组件
- **R-VR-02**：所有网络请求经由 `lib/api-client.ts`；组件内不得直接 `fetch`
- **R-VR-03**：服务器状态使用 TanStack Query；`useEffect` + 手动 fetch 视为反模式
- **R-VR-04**：全局状态需有 ADR 论证必要性；默认优先组件局部状态与 URL 状态
- **R-VR-05**：环境变量通过 `lib/env.ts` 校验导出；禁止直接读取 `import.meta.env.*`
- **R-VR-06**：路由必须懒加载，首屏 bundle < 200KB (gzipped)
- **R-VR-07**：表单使用 `react-hook-form` + `zodResolver`
- **R-VR-08**：组件测试用 React Testing Library；避免渲染细节测试

## 推荐 protocols

- **新增页面**：先建 route + page + feature 目录三件套；补 loader/query；最后接入组件
- **新增 API 调用**：定义 Zod schema + fetcher → 暴露为 `useXxxQuery`/`useXxxMutation` → 组件消费
- **性能优化**：先跑 bundle-visualizer，定位再拆 chunk；不做"预优化"

## 推荐 ADR 主题

- `路由库选型`（React Router / TanStack Router）
- `状态管理`（Zustand / Redux Toolkit / Jotai）
- `API 客户端`（TanStack Query + fetch / RTK Query / axios + SWR）
- `UI 组件库`（shadcn/ui / MUI / Ant Design / Mantine）
- `样式方案`（Tailwind / CSS Modules / vanilla-extract）

## 监控与运维

- Web Vitals：`web-vitals` 包 + 上报到 Sentry / GA4 / 自建
- 错误：`@sentry/react` + `errorBoundary`；Source map 上传 CI
- 日志：生产 console.log 禁用；调试信息走 Sentry breadcrumbs
- 分析：PostHog / Plausible；按需采集

## 测试策略

- 单元：Vitest + RTL；每个 hook / util 一个 spec
- MSW：handlers 放 `src/test/msw/`，开发 + 测试共用
- E2E：Playwright / Cypress，覆盖登录 + 核心转化
- 覆盖率门槛：features/*/api ≥ 80%，components/ui ≥ 70%

## 代码骨架示例

### env（lib/env.ts）

```ts
import { z } from 'zod'

const schema = z.object({
  VITE_API_BASE: z.string().url(),
  VITE_SENTRY_DSN: z.string().optional(),
  MODE: z.enum(['development', 'production', 'test']),
})

export const env = schema.parse(import.meta.env)
```

### TanStack Query fetcher

```ts
export const usersQuery = (id: string) => ({
  queryKey: ['users', id] as const,
  queryFn: async ({ signal }) => {
    const res = await apiClient.get<UserDto>(`/users/${id}`, { signal })
    return UserSchema.parse(res.data)
  },
  staleTime: 30_000,
})

export function useUser(id: string) {
  return useQuery(usersQuery(id))
}
```

### 路由懒加载（React Router）

```ts
const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, lazy: () => import('@/pages/Home') },
      { path: 'orders', lazy: () => import('@/pages/Orders') },
      { path: '*', element: <NotFound /> },
    ],
  },
])
```

### 权限高阶组件

```tsx
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

## 发布检查清单

- [ ] `pnpm build` 首屏 chunk < 200KB (gzipped)
- [ ] 所有路由已懒加载
- [ ] Sentry sourcemap 已上传并在构建后删除源映射
- [ ] `.env.production` 仅含 `VITE_*` 前缀
- [ ] `index.html` 已配置 CSP meta
- [ ] Lighthouse Performance ≥ 90
- [ ] MSW 生产已禁用（仅 dev/test bundle）

## AI 生成规范时的自查清单

生成 Vite + React 项目规范前，Agent 应确认：

1. React 版本：18 还是 19？影响 Suspense/Server Components 能力假设
2. 路由库痕迹：`react-router-dom` / `@tanstack/react-router` / 无路由？没有路由的是单页工具类应用，规范要大幅精简
3. 状态管理痕迹：`zustand` / `@reduxjs/toolkit` / `jotai` / `mobx`？按实际库写规则
4. UI 库痕迹：`@mui/material` / `antd` / `@radix-ui/*` + `tailwindcss` / 无？规范中的组件分层要贴合
5. 是否有 `@tanstack/react-query`？有则"服务器状态"规则保留；否则要补充或改写
6. 是否存在 BFF / Edge function 迹象？若是，建议迁移到 Next.js 的 ADR
7. 构建是否启用 `@vitejs/plugin-legacy`？影响浏览器兼容性目标
8. 是否有 PWA（`vite-plugin-pwa`）？有则追加 Service Worker 的规范

## 与其他预设的对照要点

- 与 **Next.js**：Vite + React 更轻但缺 SSR / RSC；强 SEO / 首屏场景应考虑迁移
- 与 **Nuxt**：对等但语言生态不同；混合团队不建议并存两套前端栈
- 与 **Electron**：Electron 渲染进程最常用这套，规则要与 Electron 预设的安全约束合并

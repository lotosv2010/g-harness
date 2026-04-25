# Next.js 预设知识库

> 供 Deep Agent 生成规范文件时参考的 Next.js 领域知识。
> 版本取向：Next.js 14+（App Router 稳定）；兼容 Pages Router 但不优先。

## 技术栈定位

Next.js 是基于 React 的全栈框架，覆盖 SSR/SSG/ISR/RSC、路由、API、构建、部署（Vercel 原生 / Node.js adapter / standalone）。生成规范时默认按"App Router + TypeScript + Server Components"技术栈推理。

**典型心智模型**：
- 每个路由段是一个可被服务端预渲染的文件夹
- 服务端组件（默认）不可携带交互；客户端组件需 `'use client'`
- 数据获取优先在 Server Component 内直接 `await`；避免在 Client Component 里用 useEffect fetch
- 状态管理不是首要痛点；服务端渲染 + URL 状态优先

## 标准分层

```
app/                          # App Router 根（文件系统即路由）
├── (marketing)/              # Route Group（URL 无映射）
├── (app)/                    # 登录后区域
│   ├── layout.tsx            # 持久化壳层（Sidebar、Header）
│   └── dashboard/page.tsx
├── api/                      # Route Handlers（REST）
│   └── [resource]/route.ts
├── layout.tsx                # 根布局（provider、font、meta）
└── globals.css

components/                   # 跨路由复用的 UI 组件
├── ui/                       # 原子组件（Button/Input，无业务）
├── forms/                    # 带字段校验的表单
└── feature/                  # 业务组件（与路由耦合的可复用片段）

lib/                          # 纯函数、客户端/服务端共享
├── db/                       # Prisma/Drizzle client + query helpers
├── auth/                     # NextAuth / Clerk 适配层
├── utils/                    # 纯工具（格式化、guard）
└── validators/               # Zod schema，请求/响应复用

server/                       # 仅服务端可见的逻辑
├── actions/                  # Server Actions
├── services/                 # 跨路由业务层（调用 db、external API）
└── guards/                   # 权限/限流装饰器

types/                        # 纯类型声明
hooks/                        # Client Component 自定义 hook（'use client'）
styles/                       # Tailwind config 扩展 / CSS 变量
```

**关键边界**：
- `app/` 不写业务逻辑，仅组合 `components/` + `server/actions|services/`
- `lib/` 可被 Server & Client 引用；`server/` 严格不得被 Client Component import
- Route Handlers（`api/*/route.ts`）仅做 HTTP 适配，业务逻辑下沉 `server/services`

## 数据与状态

- **Server**：优先 Server Components 直接 `await query()`；mutation 用 Server Actions（带 `revalidatePath`/`revalidateTag`）
- **Client**：TanStack Query 或 SWR；避免 Redux/Zustand 之外的全局状态
- **URL 状态**：`useSearchParams` + `nuqs` 作为"第三种状态"，跨分享友好
- **Form**：`react-hook-form` + `zodResolver`；与 Server Action 的 FormData 解析共用 schema

## 性能与渲染

- 默认 Server Component，能静态就静态（`export const dynamic = 'force-static'`）
- `<Image>` / `<Link>` 强制使用；`<Script>` 配合 `strategy`
- Suspense streaming：页面级 `loading.tsx`；组件级 `<Suspense fallback>`
- `unstable_cache` / `fetch` 的 `next: { revalidate }` 做按需缓存

## 常见陷阱

1. **Client/Server 边界误用**：在 Server Component 里用 `useState`、在 Client Component 里 `await` 数据库
2. **环境变量泄漏**：`NEXT_PUBLIC_*` 会打进 bundle；密钥变量必须裸名
3. **动态路由缓存**：未显式 `force-dynamic` 的路由误被静态化导致数据陈旧
4. **Route Handlers 与 Server Actions 混用**：同一 mutation 两种入口容易一致性出问题
5. **`'use server'` 的全文件副作用**：顶层加这句后整个文件所有导出成为 Server Actions
6. **RSC 序列化限制**：向 Client Component 传 props 时 function / class 不可序列化
7. **middleware 执行在 Edge runtime**：不能用 Node-only API（Prisma、fs）

## 推荐 rules（写进目标项目 .claude/rules/）

- **R-NEXT-01**：路由组件（`page.tsx` / `layout.tsx`）默认 Server Component，启用 `'use client'` 必须注释原因
- **R-NEXT-02**：Client Component 禁止直接 import `server/` 模块，违反时 TS 报错
- **R-NEXT-03**：任何 mutation 必须经由 Server Action 或 Route Handler，不得在 Client 直连 DB
- **R-NEXT-04**：Server Action 必须用 Zod 校验 FormData，失败返回结构化错误
- **R-NEXT-05**：`fetch` 调用必须显式声明 `cache` / `next.revalidate`
- **R-NEXT-06**：环境变量仅从 `lib/env.ts` 的 Zod 校验模块读取，禁止散落 `process.env.*`
- **R-NEXT-07**：组件文件 ≤ 300 行；单文件导出超过 3 个必须拆分

## 推荐 protocols（写进 .claude/protocols/）

- **新增路由**：先建 `page.tsx` + `loading.tsx` + `error.tsx` 三件套；metadata 在 `page.tsx` 顶部导出
- **新增 API**：优先考虑 Server Action；仅在需要被外部或非 React 客户端调用时用 Route Handler
- **迁移交互到 Client**：先判断是否可通过 Server Component + Suspense 解决；确认需要才加 `'use client'`

## 推荐 ADR 主题

- `RSC vs Pages Router` 的取舍记录
- `fetch 缓存策略`（static / dynamic / ISR）
- `Server Actions vs Route Handlers` 分工
- `认证方案`（NextAuth / Clerk / Custom JWT）
- `数据库 ORM 选型`（Prisma / Drizzle）

## 监控与运维

- Web Vitals：`reportWebVitals` hook + Vercel Analytics / OpenTelemetry
- 错误：Sentry（`@sentry/nextjs`）自动捕获 Server Action / Client / Edge 三处
- 日志：结构化 JSON（pino）；serverless 函数默认 stdout 聚合
- 构建产物监控：`@next/bundle-analyzer` 入 CI

## 测试策略

- 单元：Vitest + React Testing Library（Server Component 通过 `renderHook` 限制，偏集成）
- 组件：Storybook + Chromatic
- E2E：Playwright，必测登录 + 关键转化路径
- 覆盖率门槛：lib/* ≥ 80%，components/* ≥ 60%

## 代码骨架示例

### env 校验（lib/env.ts）

```ts
import { z } from 'zod'

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'test', 'production']),
})

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export const env = {
  ...serverSchema.parse(process.env),
  ...clientSchema.parse({ NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL }),
}
```

### Server Action 模板

```ts
'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const CreateOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
})

export async function createOrder(_: unknown, formData: FormData) {
  const parsed = CreateOrderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.flatten() }
  }
  await orderService.create(parsed.data)
  revalidatePath('/orders')
  return { ok: true as const }
}
```

### 分层边界检查（ESLint 规则）

```json
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        { "target": "./components", "from": "./server", "message": "client cannot import server/*" },
        { "target": "./app", "from": "./server/db", "message": "page must go through services" }
      ]
    }]
  }
}
```

## 发布检查清单

- [ ] `next build` 无 warnings
- [ ] bundle-analyzer 首屏 JS < 200KB (gzipped)
- [ ] Lighthouse Performance ≥ 90
- [ ] 所有动态路由显式声明 `dynamic` / `revalidate`
- [ ] 错误边界 `error.tsx` 覆盖关键路径
- [ ] Sentry release + sourcemap 已上传
- [ ] `.env.production` 所有密钥已轮换
- [ ] CSP 头部 + HSTS 配置生效

## AI 生成规范时的自查清单

生成 Next.js 项目规范前，Agent 应确认：

1. 是否确定使用 App Router？若 `next.config` 里有 `pages/` 混用，需单独记录并降低假设强度
2. 是否有既有 ORM 痕迹（`prisma/schema.prisma` / `drizzle.config.ts`）？如有，SPEC 的数据层要反映真实选型
3. 是否使用 shadcn/ui 或 Radix？若是，组件分层规则应与 `components/ui` 约定对齐
4. 是否启用 TanStack Query？若是，"服务器状态"规则需保留；否则要改写为 RSC + Server Actions 单轨
5. middleware.ts 是否存在？权限/地区路由规则是否已在其中？
6. `env.schema.ts` 是否存在？若否，推荐的 R-NEXT-06 规则要标记为"新增"
7. 图片域名是否在 `next.config` 的 `images.remotePatterns`？否则 `<Image>` 使用会失败

## 与其他预设的对照要点

- 与 **Nuxt**：心智模型对称（SSR/ISR/服务端 API），但状态管理、data fetching 语法不同
- 与 **Vite + React**：Next.js 替代了"客户端路由 + SSR 包装器"的组合，Agent 在迁移场景下要评估 RSC 收益 vs 迁移成本
- 与 **NestJS**：Route Handlers 只是轻量 HTTP 适配；复杂后端不建议在 Next.js 内承担，优先独立后端 + Next.js 作 BFF

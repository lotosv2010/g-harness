# Nuxt 预设知识库

> 供 Deep Agent 生成规范文件时参考的 Nuxt 领域知识。
> 版本取向：Nuxt 3+（Nitro 引擎，Vue 3 + Vite）；兼容但不兼容 Nuxt 2。

## 技术栈定位

Nuxt 是基于 Vue 3 的全栈同构框架，理念类似 Next.js 之于 React：文件路由、SSR/SSG/ISR、服务端 API（`server/api/`）、自动导入（composables / components）、模块生态。

**典型心智模型**：
- `pages/` 即路由；`server/` 即后端
- 自动导入免去手动 import（composables、components、utils）
- `useFetch` / `useAsyncData` 是同构数据获取核心，SSR 水合自动处理
- Nitro 引擎使后端可部署到任意 platform（Vercel / Cloudflare / Node）

## 标准分层

```
app.vue                         # 根组件（可选，默认 Nuxt 自动处理）
nuxt.config.ts                  # 核心配置
├── pages/                      # 文件路由
│   ├── index.vue
│   ├── about.vue
│   └── users/[id].vue
├── layouts/                    # 布局（在 page 中 definePageMeta({ layout }) 指定）
│   ├── default.vue
│   └── auth.vue
├── components/                 # 自动导入组件
│   ├── Atom/                   # <AtomButton> / <AtomInput>
│   ├── Feature/                # 业务组件
│   └── Base/
├── composables/                # 自动导入 composable（必须 use 开头）
│   ├── useAuth.ts
│   └── useOrders.ts
├── server/
│   ├── api/                    # h3 路由 → /api/*
│   │   └── users/[id].get.ts
│   ├── middleware/             # 服务端中间件
│   ├── utils/                  # 服务端工具
│   └── plugins/                # Nitro 插件（钩子）
├── stores/                     # Pinia store（需 @pinia/nuxt）
├── middleware/                 # 路由中间件（客户端）
├── plugins/                    # 客户端/服务端插件
├── utils/                      # 自动导入的纯工具
├── types/                      # 类型（需 .d.ts 或 index.ts）
└── assets/ + public/           # 静态资源
```

**关键边界**：
- `pages/` 不写业务逻辑，仅组合 composables + components
- `server/` 严格服务端；不得被 `pages/` 或 `components/` 直接 import（通过 `$fetch`/`useFetch`）
- `composables/` 是业务层；组件不直接调 `$fetch`
- `stores/` 最小化；能 composable 就 composable

## 数据与状态

- **SSR 数据**：`useFetch` / `useAsyncData` 自动去重 + 水合；`refresh()` 显式刷新
- **客户端专用**：`onMounted` + `$fetch`
- **全局状态**：Pinia（`@pinia/nuxt`）；需同构支持的状态必须 SSR-safe
- **URL 状态**：`useRoute().query` + `useRouter().push`；SSR 友好

## 服务端与 API

- `server/api/*.{get,post,put,delete}.ts` 即自动路由
- `defineEventHandler(async (event) => {...})` 是唯一签名
- 使用 `readBody(event)` / `getQuery(event)` / `getRouterParam(event, 'id')`
- 与 `h3` 规范一致；可返回对象、`sendRedirect()`、`createError()`

## 常见陷阱

1. **双重水合 bug**：`ref` 初值来自随机/时间导致 server/client mismatch；用 `useState` 同构状态
2. **`process.server/client` 检查**：在 setup 外用 `import.meta.server/client`
3. **自动导入陷阱**：新增组件/composable 需要重启 dev server（偶发）
4. **SSR 内存泄漏**：在顶层作用域持有状态 → 用户共享；必须 `useState('key', () => initial)` 或 setup 内部
5. **`useFetch` 缓存 key 冲突**：默认基于 URL；动态参数要显式传 `key`
6. **环境变量**：`runtimeConfig` 分 `public`（前端可见）和私有（默认服务端）；直接 `process.env` 仅服务端可见
7. **部署目标差异**：`nitro.preset` 不同会导致 API 行为差异（边缘 vs Node），本地需对齐

## 推荐 rules

- **R-NUXT-01**：`pages/*.vue` 仅做组合；业务逻辑进 composables
- **R-NUXT-02**：服务端 API 调用统一经由 `useFetch` / `useAsyncData`；禁止组件内 `fetch`
- **R-NUXT-03**：`server/` 不得被 `pages/ | components/ | composables/` 直接 import
- **R-NUXT-04**：`runtimeConfig.public` 仅放非敏感信息；密钥走私有 runtimeConfig
- **R-NUXT-05**：Pinia store 必须定义 `state`/`getters`/`actions` 三段式；禁止在 action 外改 state
- **R-NUXT-06**：组件与 composable 命名：`<PascalCase>.vue` / `useCamelCase.ts`
- **R-NUXT-07**：表单校验用 `vee-validate` + `zod`

## 推荐 protocols

- **新增页面**：`pages/xxx.vue` → `definePageMeta({ layout, middleware })` → composable 封装数据层 → 组件消费
- **新增 API**：`server/api/xxx.{method}.ts` → `defineEventHandler` → 业务下沉 `server/utils` → `useFetch` 前端调用
- **SSR 问题排障**：先 `nuxi dev --inspect`；mismatch 先检查初值 & `useState` 使用

## 推荐 ADR 主题

- `渲染模式选择`（universal / SSR / SSG / SPA）
- `部署 preset`（Node / Vercel / Cloudflare / static）
- `状态管理`（Pinia / composables + useState）
- `UI 库`（Nuxt UI / Element Plus / Vuetify）
- `鉴权方案`（Sidebase / nuxt-auth-utils / 自建）

## 监控与运维

- 内置 Nitro hooks：`nitroApp.hooks.hook('error', fn)` 捕获服务端异常
- `@nuxt/devtools` 开发期性能审计
- 运行时：Sentry `@sentry/nuxt` 模块；分 Client/Server SDK
- 指标：`@nuxtjs/web-vitals` 或自建上报

## 测试策略

- 单元：Vitest + `@nuxt/test-utils/runtime`（对 composable / util 最友好）
- 组件：`@vue/test-utils` + Vitest；用 stubs 隔离自动导入
- E2E：Nuxt test-utils 的 `setup()` + Playwright
- 覆盖率门槛：composables ≥ 80%，server/api ≥ 70%

## 代码骨架示例

### runtimeConfig 定义（nuxt.config.ts）

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    databaseUrl: '',           // 仅服务端可读
    jwtSecret: '',
    public: {
      appUrl: '',              // 前后端均可读
      sentryDsn: '',
    },
  },
})
```

### composable 模板

```ts
export function useOrders() {
  const { data, pending, error, refresh } = useFetch<OrderDto[]>('/api/orders', {
    key: 'orders:list',
    default: () => [],
  })
  return { orders: data, pending, error, refresh }
}
```

### 服务端 API

```ts
// server/api/orders/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'missing id' })

  const order = await orderService.findById(id)
  if (!order) throw createError({ statusCode: 404 })
  return order
})
```

### 路由中间件

```ts
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuthStore()
  if (to.meta.requiresAuth && !user) return navigateTo('/login')
})
```

## 发布检查清单

- [ ] `nuxi build` 无警告
- [ ] `runtimeConfig.public` 无敏感信息
- [ ] `nitro.preset` 与目标平台对齐
- [ ] 所有 `useFetch` 显式 key
- [ ] SSR mismatch 无 console warning
- [ ] Sentry release + sourcemap 已上传
- [ ] Lighthouse Performance ≥ 90

## AI 生成规范时的自查清单

生成 Nuxt 项目规范前，Agent 应确认：

1. 是否为 Nuxt 3？`nuxt.config.ts` 存在即是；Nuxt 2 差异巨大，不适用本文档
2. 渲染模式：`ssr: true`（默认 universal）/ `ssr: false`（SPA）/ `routeRules` 混合？决定 SPEC 与 rule 强度
3. 是否使用 Pinia？`@pinia/nuxt` 在 modules 即是；否则状态管理走 `useState` composable
4. `server/api/` 是否使用？若项目只有前端，不需要全栈规则
5. 是否有 `@sidebase/nuxt-auth` / `nuxt-auth-utils`？有则鉴权规范按其约定
6. UI 库：`@nuxt/ui` / `nuxt-primevue` / `element-plus-nuxt` / 无？规则要对齐
7. CMS / 内容：`@nuxt/content` 是否存在？影响 `content/` 目录的分层
8. i18n：`@nuxtjs/i18n` 是否存在？

## 与其他预设的对照要点

- 与 **Next.js**：对等框架，理念几乎一一对应，迁移路径可行但不推荐低价值迁移
- 与 **Vite + Vue**：Nuxt 在 Vite + Vue 之上加了路由/SSR/服务端；纯 SPA 不要过度投资 Nuxt
- 与 **FastAPI**：Nuxt server/ 仅适合 BFF；复杂后端仍推荐独立 FastAPI/NestJS 服务

## 模块开发分工建议

- `pages/` ↔ 页面 owner：负责组合，不承担业务
- `composables/` ↔ 业务层 owner：API 封装、缓存策略、错误语义
- `components/Feature/` ↔ 业务组件 owner：UI 与交互
- `components/Atom/` ↔ 设计系统 owner：纯 UI，跨产品复用
- `server/api/` ↔ 服务端 owner：HTTP 适配 + 业务下沉 `server/utils`
- `stores/` ↔ 谨慎新增；跨页面共享状态必须有 ADR 论证

## ROLES.md 模板建议

```markdown
## Nuxt 项目标准角色
- **前端页面 owner**：pages/ + layouts/
- **业务逻辑 owner**：composables/ + stores/
- **设计系统 owner**：components/Atom/
- **服务端 owner**：server/ + db/
- **共享类型 owner**：types/ + shared schema
```

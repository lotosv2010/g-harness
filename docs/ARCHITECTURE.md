# 架构白皮书

> 定义 G-Forge 框架的技术架构、技术栈选型、模块划分与部署方案。
> AI 在做任何架构决策前必须参考本文件。

---

## 1. 架构总览

### 1.1 五层治具架构

```
┌──────────────────────────────────────────┐
│            应用层 Application             │  ← 用户的项目源码
├──────────────────────────────────────────┤
│           工作流层 Workflow               │  ← 命令、技能、钩子、协议
├──────────────────────────────────────────┤
│            约定层 Convention              │  ← 模板、模式库、命名规范
├──────────────────────────────────────────┤
│            约束层 Constraint              │  ← 规则引擎、依赖守卫
├──────────────────────────────────────────┤
│           上下文层 Context                │  ← CLAUDE.md 层级、ADR、术语表
└──────────────────────────────────────────┘
```

### 1.2 Monorepo 结构

```
g-forge/
├── packages/
│   ├── web/              # 前端应用（文档站 / Dashboard）
│   ├── server/           # 后端服务（CLI 后端 / API）
│   ├── ai/               # AI 能力层（上下文生成、规则推理）
│   └── shared/           # 共享类型、工具函数
├── tools/                # 开发工具
└── tests/                # 全局 E2E 测试
```

## 2. 技术栈

### 2.1 核心依赖

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 语言 | TypeScript 5.x（strict） | 类型安全 + AI 友好 |
| 运行时 | Node.js 20+ | LTS 稳定版 |
| 包管理 | pnpm 9+ | 快速、严格、workspace 原生支持 |
| Monorepo | Turborepo | 增量构建、任务编排 |
| 测试 | Vitest | 与 Vite 生态一致，速度快 |
| Lint | ESLint 9 (flat config) | 新标准，可扩展 |
| 格式化 | Prettier | 团队一致性 |
| 模板引擎 | Handlebars | 成熟、逻辑简单 |
| YAML 解析 | yaml (npm) | YAML 1.2 完整支持 |
| CLI 框架 | citty 或 commander | 轻量、TypeScript 友好 |

### 2.2 前端应用（packages/web）

| 项目 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 6 |
| 路由 | React Router 7 |
| 状态 | Zustand |
| 样式 | Tailwind CSS 4 |
| 组件 | shadcn/ui |

### 2.3 服务端（packages/server）

| 项目 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 框架 | Hono / Express |
| 验证 | Zod |
| 数据库 | SQLite（本地）/ PostgreSQL（云端） |
| ORM | Drizzle |

### 2.4 AI 能力层（packages/ai）

| 项目 | 技术 |
|------|------|
| LLM 调用 | Anthropic SDK（Claude API） |
| 上下文分析 | AST 解析（ts-morph） |
| 规则推理 | 自研规则引擎 |

## 3. 模块划分

### 3.1 packages/shared — 共享层

```
shared/
├── types/                # 全局类型定义
│   ├── config.ts         # 配置文件类型
│   ├── rules.ts          # 规则定义类型
│   ├── templates.ts      # 模板类型
│   └── index.ts
├── utils/                # 工具函数
│   ├── fs.ts             # 文件系统工具
│   ├── yaml.ts           # YAML 解析工具
│   ├── naming.ts         # 命名转换工具
│   └── index.ts
└── constants/            # 共享常量
    └── index.ts
```

### 3.2 packages/ai — AI 能力层

```
ai/
├── context/              # 上下文管理
│   ├── analyzer.ts       # 项目结构分析
│   ├── generator.ts      # CLAUDE.md 生成
│   └── updater.ts        # CLAUDE.md 同步更新
├── rules/                # 规则引擎
│   ├── parser.ts         # YAML 规则解析
│   ├── validator.ts      # 代码规则校验
│   └── reporter.ts       # 违规报告
├── templates/            # 模板引擎
│   ├── renderer.ts       # 模板渲染
│   └── registry.ts       # 模板注册与发现
└── hooks/                # Claude Code 钩子
    ├── prompt-enhancer.ts
    ├── post-write.ts
    └── pre-commit.ts
```

### 3.3 packages/web — 前端应用

```
web/
├── src/
│   ├── app/              # 应用外壳
│   ├── features/         # 功能模块
│   │   ├── dashboard/    # 项目仪表盘
│   │   ├── rules/        # 规则管理
│   │   └── templates/    # 模板管理
│   ├── shared/           # 共享 UI 组件
│   └── api/              # API 层
└── vite.config.ts
```

### 3.4 packages/server — 服务端

```
server/
├── src/
│   ├── routes/           # API 路由
│   ├── services/         # 业务逻辑
│   ├── middleware/        # 中间件
│   └── db/               # 数据库
└── tsconfig.json
```

## 4. 环境变量

```bash
# .env.example（提交到 Git）
# ============================

# 应用
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# 数据库
DATABASE_URL=sqlite://./data/gforge.db

# AI（可选 — 仅 AI 增强功能需要）
ANTHROPIC_API_KEY=
AI_MODEL=claude-sonnet-4-6

# 安全
JWT_SECRET=
CORS_ORIGIN=http://localhost:5173
```

**环境变量管理规则：**
- `.env` 文件永远不提交到 Git
- `.env.example` 记录所有变量的键名和示例值
- 敏感值通过环境注入，不通过文件
- 本地开发使用 `.env.local`（gitignored）

## 5. 部署架构

### 5.1 CLI 工具（主要分发方式）

```
npm publish → npmjs.com → npx gforge init
```

CLI 是纯本地工具，不需要服务端。

### 5.2 文档站 / Dashboard（可选）

```
构建 → 静态文件 → Vercel / Cloudflare Pages
```

### 5.3 API 服务（可选 — 团队协作功能）

```
构建 → Docker 镜像 → Fly.io / Railway / 自建服务器
```

## 6. 关键架构决策

| ID | 决策 | 理由 |
|----|------|------|
| ADR-001 | Monorepo + pnpm workspace | 共享类型、统一构建、便于开发 |
| ADR-002 | YAML 作为规则定义格式 | 人和 AI 都可读写，比 JSON 更易维护 |
| ADR-003 | Handlebars 作为模板引擎 | 简单、成熟、逻辑受限（减少模板复杂度） |
| ADR-004 | CLI-first，Web 可选 | 降低使用门槛，CLI 是核心体验 |
| ADR-005 | 预设系统（Presets） | 不同框架开箱即用，减少配置成本 |

详细 ADR 记录见 `docs/decisions/` 目录。

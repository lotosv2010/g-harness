# 架构白皮书

> 定义 G-Forge 框架的技术架构、模块划分与部署方案。
> AI 在做任何架构决策前必须参考本文件。

---

## 1. 架构总览

### 1.1 五层 Harness 架构

G-Forge 通过五层结构将规范应用到目标项目：

```
┌──────────────────────────────────────────┐
│            应用层 Application             │  ← 用户的项目源码
├──────────────────────────────────────────┤
│           工作流层 Workflow               │  ← 协议、技能、钩子
├──────────────────────────────────────────┤
│            约定层 Convention              │  ← 模板、Prompt、命名规范
├──────────────────────────────────────────┤
│            约束层 Constraint              │  ← 规则引擎、护栏、校验器
├──────────────────────────────────────────┤
│           上下文层 Context                │  ← CLAUDE.md、AGENTS.md、ADR
└──────────────────────────────────────────┘
```

### 1.2 项目结构

```
g-forge/
├── AGENTS.md / CLAUDE.md / README.md
├── docs/                      # 约束与规格层
├── .claude/                   # Claude 行为控制层
├── tools/                     # 工具层（prompts / scripts）
├── tests/                     # 全局测试
│
└── src/                       # 全部业务代码
    ├── core/                  # CLI 引擎（命令、扫描、生成、校验、迁移）
    │   ├── commands/          # CLI 命令入口
    │   ├── scanner/           # 项目扫描与技术栈检测
    │   ├── generator/         # 模板渲染与文件生成
    │   ├── validator/         # 规范校验引擎
    │   └── migrator/          # 规范版本迁移
    ├── presets/               # 技术栈特定预设
    └── templates/             # 可分发内容（1:1 镜像目标项目）
        ├── .ai/               # AI 通用规范 → 输出到目标项目 .claude/
        │   ├── rules/
        │   ├── protocols/
        │   ├── guardrails/
        │   ├── prompts/
        │   ├── skills/
        │   └── hooks/
        ├── docs/              # → 目标项目 docs/
        │   ├── decisions/
        │   ├── tasks/
        │   ├── team/
        │   └── runbooks/
        ├── tests/             # → 目标项目 tests/
        ├── tools/             # → 目标项目 tools/
        ├── AGENTS.template.md
        └── CLAUDE.template.md
```

## 2. 技术栈（g-forge 自身）

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 语言 | TypeScript 5.x（strict） | 类型安全 + AI 友好 |
| 运行时 | Node.js 20+ | LTS 稳定版 |
| 包管理 | pnpm | 快速、严格 |
| 测试 | Vitest | 速度快、TypeScript 原生支持 |
| Lint | ESLint 9 (flat config) | 新标准，可扩展 |
| 格式化 | Prettier | 团队一致性 |
| CLI 框架 | commander | 轻量、TypeScript 友好 |
| 模板引擎 | 自研变量替换 | `{{variable}}` 简单替换，避免重依赖 |
| YAML 解析 | yaml (npm) | YAML 1.2 完整支持 |

## 3. 模块划分

### 3.1 src/core/scanner — 项目扫描器

职责：检测目标项目的技术栈、目录结构、现有配置。

```
scanner/
├── index.ts               # 公共 API
└── project-scanner.ts     # 扫描实现
```

输入：目标项目根目录路径
输出：`ScanResult`（技术栈、项目结构、现有配置）

### 3.2 src/core/generator — 文件生成器

职责：读取模板 + 预设变量，渲染输出到目标项目。

```
generator/
├── index.ts               # 公共 API
└── file-generator.ts      # 生成实现
```

输入：预设名、目标目录、变量映射
输出：`GenerateResult`（已创建/跳过/覆盖的文件列表）

### 3.3 src/core/validator — 规范校验器

职责：检查目标项目是否符合规范规则。

```
validator/
├── index.ts               # 公共 API
└── rule-validator.ts      # 校验实现
```

输入：目标项目根目录路径
输出：`ValidationResult`（通过与否、违规列表、警告列表）

### 3.4 src/core/migrator — 配置迁移器

职责：规范版本升级时，迁移目标项目的配置文件。

```
migrator/
├── index.ts               # 公共 API
└── config-migrator.ts     # 迁移实现
```

输入：目标目录、源版本、目标版本
输出：`MigrateResult`（已迁移文件、需手动处理的文件）

### 3.5 src/presets/ — 技术栈预设

每个预设补充通用规范，提供技术栈特定的规则、技能和模板。

```
src/presets/<name>/
├── preset.json            # 预设元数据（技术栈、变量值、命令）
├── rules/                 # 栈特定规则
└── skills/                # 栈特定技能
```

### 3.6 src/core/analyzer — 内容分析与补全（v1.3+）

职责：从项目描述和技术栈推导 SPEC/ARCHITECTURE 的结构化内容，为生成器提供模板变量值。

```
analyzer/
├── index.ts                  # 公共 API
├── description-analyzer.ts   # 描述分析：领域 / 应用类型 / 特性 / 建议模块
├── content-completer.ts      # 规则版内容补全（projectPositioning 等 8 字段）
├── auto-describe.ts          # 老项目从 package.json + README 自动推导 name/description
└── llm-completer.ts          # 可选 LLM 增强层（Anthropic / OpenAI，透明降级）
```

输入：`projectDescription` + `ScanResult` + `presetFragment`
输出：`ContentCompletion`（projectPositioning / coreValueTable / productBoundaries / initialFeatures / nfrHints / architectureOverview / moduleBreakdown / projectStructureHint）

### 3.7 src/core/indexer — 项目索引器（v1.3+）

职责：扫描源码生成 AI 优先阅读的三个索引文件，避免广度扫描 token 浪费。

```
indexer/
├── index.ts                  # 公共 API（buildProjectIndex）
├── types.ts                  # ProjectIndex / ModuleEntry / RouteEntry / FeatureEntry
├── route-parser.ts           # 路由解析（next-app/next-pages/nuxt/react-router/vue-router/express）
├── module-extractor.ts       # 模块提取（src/ 扫描 + index.ts exports 解析）
├── feature-mapper.ts         # 模块+路由 → 功能映射
├── index-writer.ts           # 渲染 PROJECT_MAP / FEATURES / ROUTES Markdown
└── index-drift.ts            # 漂移检测（added / removed / dangling）
```

输入：`rootDir` + `ScanResult`
输出：`docs/PROJECT_MAP.md`、`docs/FEATURES.md`、`docs/ROUTES.md`

命令：`gforge index` / `gforge index --watch` / `gforge index --check`

### 3.8 src/templates/ — 可分发内容

所有输出给目标项目的内容，目录结构 1:1 镜像目标项目。
CLI `init` 命令读取此目录，渲染模板变量后输出。

```
src/templates/
├── .ai/                   # AI 通用规范 → 输出到目标项目 .claude/
│   ├── rules/             # 通用规则（安全、代码质量、架构）
│   ├── protocols/         # 执行协议（feature、bugfix、refactor、review、incident、migration、api-design）
│   ├── guardrails/        # 护栏定义（边界检查、提交前检查）
│   ├── prompts/           # Prompt 模板（Bug 报告、代码审查等）
│   ├── skills/            # 可复用技能（feat、test-gen、scaffold、analyze、release、security、debt、pr）
│   └── hooks/             # 事件钩子
├── docs/                  # → 目标项目 docs/
│   ├── decisions/         # ADR 模板
│   ├── tasks/             # 任务看板、活跃任务
│   ├── team/              # 角色分工
│   └── runbooks/          # 运维操作手册
├── tests/                 # → 目标项目 tests/
├── tools/                 # → 目标项目 tools/
├── AGENTS.template.md     # → 目标项目 AGENTS.md
└── CLAUDE.template.md     # → 目标项目 CLAUDE.md
```

## 4. 数据流

```
用户运行 gforge init --preset vite-react
         │
         ▼
   CLI 解析命令参数
         │
         ▼
   Scanner 扫描目标项目
   （检测技术栈、目录结构、现有配置）
         │
         ▼
   加载预设（src/presets/vite-react/preset.json）
   加载模板（src/templates/）
         │
         ▼
   Generator 渲染模板
   （{{variable}} → 预设变量值）
         │
         ▼
   输出文件到目标项目
   ├── CLAUDE.md
   ├── AGENTS.md
   ├── .claude/rules/*.md
   ├── .claude/protocols/*.md
   └── ...
```

## 5. 部署架构

### 5.1 CLI 工具（主要分发方式）

```
npm publish → npmjs.com → npx gforge init
```

CLI 是纯本地工具，不需要服务端。

### 5.2 文档站（可选，未来）

```
构建 → 静态文件 → Vercel / Cloudflare Pages
```

## 6. 关键架构决策

| ID | 决策 | 理由 |
|----|------|------|
| ADR-001 | 单包结构，业务代码统一收纳于 src/ | 框架定位是规范工具，根目录保持 AI 指导结构 |
| ADR-002 | Markdown 作为规范文件格式 | AI 原生友好，零解析成本，人类可读 |
| ADR-003 | 自研变量替换替代模板引擎 | `{{var}}` 足够简单，9 行实现，零依赖 |
| ADR-005 | 统一技能格式规范 | 标准化 skill 定义，支持跨预设复用 |
| ADR-006 | 模板变量 Schema | 统一 `{{variable}}` 命名和类型约束，确保预设间一致性 |
| ADR-007 | init 6 阶段 Wizard + 老项目双模式 | 明确 new/existing/reinit 分支；老项目 auto-describe 降低输入成本 |
| ADR-008 | 项目索引作为 AI 上下文优先入口 | PROJECT_MAP/FEATURES/ROUTES 三文件让 AI 改动前先读索引，避免广度扫描 |
| ADR-009 | LLM 补全层的白名单字段 + 透明降级 | 仅增强叙述字段，无 API key / 超时 / 解析失败一律回落规则版 |

详细 ADR 记录见 `docs/decisions/` 目录。

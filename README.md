# G-Harness — AI 驱动的工程化规范框架 + CLI 工具

> Harness Engineering：让 AI 在约束中写出更好的代码。

## 是什么

G-Harness 是一套**面向 AI 编程助手优化的通用工程化规范框架**。它不是又一个脚手架，而是一个**工程治具（Engineering Harness）**——通过结构化的规则、协议、模板和预设，引导 AI 在任意技术栈的项目中持续输出一致的、生产级的代码。

**G-Harness = 通用规范 + CLI 工具 + 预设系统**

## 解决什么问题

| 痛点 | G-Harness 方案 |
|------|-------------|
| AI 生成代码风格不一致 | 约定层：模板 + Prompt + 命名规范 |
| AI 不了解项目架构 | 上下文层：CLAUDE.md + AGENTS.md + ADR |
| AI 违反架构边界 | 约束层：规则引擎 + 护栏 + 校验器 |
| 团队成员 AI 用法各异 | 工作流层：标准协议 + 技能 + 钩子 |
| 已有项目难以接入 | 渐进式采纳：第 1 天即生效 |
| 不同技术栈需重新配置 | 预设系统：开箱即用的技术栈支持 |

## 核心架构

```
┌──────────────────────────────────────────┐
│            应用层 Application             │  ← 用户项目源码
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

> 五层与具体文件/目录的完整映射见 [`docs/ARCHITECTURE.md § 1.2 五层 → 目录/文件映射`](docs/ARCHITECTURE.md#12-五层--目录文件映射)。

## 目录结构

```
g-harness/
├── AGENTS.md                  # 通用 AI 开发规范
├── CLAUDE.md                  # Claude Code 专用配置
├── README.md                  # 本文件
│
├── docs/                      # 约束与规格层
│   ├── SPEC.md                # 产品说明书 + 需求规格说明书
│   ├── ARCHITECTURE.md        # 架构白皮书
│   ├── DESIGN.md              # 技术 / UI 设计
│   ├── API.md                 # API 契约定义
│   ├── DATA_MODEL.md          # 数据模型规格
│   ├── decisions/             # 架构决策记录（ADR）
│   ├── runbooks/              # 运维操作手册
│   ├── team/                  # 角色与分工
│   └── tasks/                 # 任务看板
│
├── .claude/                   # Claude 行为控制层
│   ├── rules/                 # 硬性规则
│   ├── protocols/             # 任务执行协议
│   ├── skills/                # 可复用能力模板
│   ├── prompts/               # AI 开发 Prompt
│   ├── guardrails/            # 自动约束检查
│   └── hooks/                 # 事件钩子（规划中 · v0.3）
│
├── tools/                     # 工具层
│   ├── prompts/               # 通用 Prompt（非 Claude 专用）
│   └── scripts/               # 自动化脚本（按需添加）
│
├── tests/                     # 全局测试
│
└── src/                       # 全部业务代码
    ├── core/                  # CLI 引擎（命令、扫描、生成、校验、迁移）
    ├── presets/               # 技术栈预设
    └── templates/             # 可分发内容（1:1 镜像目标项目）
```

## 快速开始

```bash
# 交互式初始化（6 阶段引导：项目检测 → AI 助手 → 元信息 → 技术栈 → 输出配置 → 确认）
npx g-harness init

# 非交互模式（CI/CD 友好）
npx g-harness init --agent claude --preset vite-react --yes

# 多个 AI 助手同时配置
npx g-harness init --agent claude,cursor --preset nextjs

# 启用 LLM 内容增强（检测到 ANTHROPIC_API_KEY / OPENAI_API_KEY 时改写 positioning / boundaries / modules 三段叙述，失败透明降级）
npx g-harness init --llm

# 启用 Deep Agent 自主生成（v1.4，需先 pnpm add -D deepagents @langchain/core @langchain/langgraph @langchain/anthropic @langchain/openai zod）
npx g-harness init --deep-agent --depth medium   # shallow / medium / deep

# 显式指定 Provider / Model / API Key（ADR-011，--api-key 会进 shell history，生产环境请用 env）
npx g-harness init --deep-agent --depth deep --model claude-sonnet-4-5 --yes
npx g-harness init --llm --provider openai --model gpt-4o --api-key sk-... --yes

# 已有项目：指定冲突策略
npx g-harness init --conflict prompt    # 逐文件确认
npx g-harness init --force              # 覆盖所有

# 生成项目索引（AI 必读三件套：模块 / 功能 / 路由）
npx g-harness index             # 首次生成 docs/PROJECT_MAP.md、FEATURES.md、ROUTES.md
npx g-harness index --watch     # 监听 src/ 变化，500ms 防抖增量更新
npx g-harness index --check     # 漂移检测，发现 added / removed / dangling 时 exit 1

# 校验规范
npx g-harness validate

# 同步上下文
npx g-harness context sync
```

> **项目索引（v1.3）**：`g-harness index` 生成的三个索引文件（`PROJECT_MAP.md` / `FEATURES.md` / `ROUTES.md`）被协议硬化为 AI 改动前的必读入口。AI 先读索引再定位代码，避免整库广度扫描，显著降低 token 消耗。

> **Deep Agent 模式（v1.4）**：`--deep-agent` 启用 LangGraph.js + `deepagents` 驱动的自主规范生成。Agent 读取项目（索引优先 → package → README → 按深度 list_dir / read_file / grep）再产出贴合项目实际的完整规范（SPEC、ARCHITECTURE、ADR-001、rules、protocols、入口文件）。三档 depth：`shallow`（≤15k token / ~20s）/ `medium`（≤50k / ~40s，推荐）/ `deep`（≤150k / ~90s）。三级降级链 `deep-agent → llm-enhance → template`，任一失败自动下沉，主流程永不崩溃。成本与 trace 写入 `docs/.g-harness/agent-trace-{ts}.jsonl`。

> 详细用法请参阅 [快速入门指南](GETTING_STARTED.md)。

## 渐进式采纳

| 阶段 | 时间 | 做什么 | 效果 |
|------|------|--------|------|
| 1 | 第 1 天 | 添加 CLAUDE.md + AGENTS.md | 零代码变更，AI 立即理解项目 |
| 2 | 第 1 周 | 添加规则与协议 | 新代码自动遵循约定 |
| 3 | 第 2-4 周 | 启用护栏与钩子 | 阻止架构违规 |
| 4 | 持续 | 逐模块迁移 | AI 辅助，渐进式，可回退 |

## 支持的技术栈

| 预设 | 命令 | 状态 |
|------|------|------|
| Next.js | `--preset nextjs` | 已完成 |
| Nuxt 3 | `--preset nuxt` | 已完成 |
| NestJS | `--preset nestjs` | 已完成 |
| Vue 3 + Vite | `--preset vite-vue` | 已完成 |
| React + Vite | `--preset vite-react` | 已完成 |
| Electron | `--preset electron` | 已完成 |
| Tauri 2 | `--preset tauri` | 已完成 |
| React Native | `--preset react-native` | 已完成 |
| 微信小程序 | `--preset miniprogram` | 已完成 |
| FastAPI | `--preset fastapi` | 已完成 |
| Express/Hono/Fastify | `--preset express` | 已完成 |
| Monorepo | `--preset monorepo` | 已完成 |
| uni-app | `--preset uniapp` | 已完成 |
| Flutter | `--preset flutter` | 已完成 |
| 纯 HTML + JS | `--preset vanilla` | 已完成 |
| 通用（技术栈无关） | `--preset base` | 已完成 |

## 支持的 AI 助手

| AI 助手 | 参数 | 入口文件 | 规则 | 钩子/协议/技能 |
|---------|------|----------|------|---------------|
| Claude Code | `--agent claude` | `CLAUDE.md` | `.claude/rules/` | protocols / skills / guardrails 完整；hooks v0.3 规划中 |
| Cursor | `--agent cursor` | `.cursorrules` | `.cursor/rules/` | — |
| Windsurf | `--agent windsurf` | `.windsurfrules` | `.windsurf/rules/` | — |
| GitHub Copilot | `--agent copilot` | `.github/copilot-instructions.md` | `.github/rules/` | — |
| Trae | `--agent trae` | `.trae/rules/project.md` | `.trae/rules/` | — |
| Kimi | `--agent kimi` | `AGENTS.md` | `.agents/rules/` | — |
| Codex | `--agent codex` | `AGENTS.md` | `.codex/rules/` | — |
| 通用模式 | `--agent generic` | 仅 `AGENTS.md` | — | — |

> 支持多选：`--agent claude,cursor` 一次生成多个 AI 助手的配置文件。

## 设计原则

- **上下文优先** — AI 输出质量 ∝ 上下文质量
- **约定优于配置** — 减少决策，提升一致性
- **技术栈无关** — 通用规范 + 预设系统适配任何技术栈
- **渐进式采纳** — 新老项目通吃
- **验证闭环** — 每个 AI 动作都有校验点

## 许可

MIT

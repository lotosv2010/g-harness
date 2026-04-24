# G-Forge — AI 驱动的工程化规范框架 + CLI 工具

> Harness Engineering：让 AI 在约束中写出更好的代码。

## 是什么

G-Forge 是一套**面向 AI 编程助手优化的通用工程化规范框架**。它不是又一个脚手架，而是一个**工程治具（Engineering Harness）**——通过结构化的规则、协议、模板和预设，引导 AI 在任意技术栈的项目中持续输出一致的、生产级的代码。

**G-Forge = 通用规范 + CLI 工具 + 预设系统**

## 解决什么问题

| 痛点 | G-Forge 方案 |
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

## 目录结构

```
g-forge/
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
│   └── hooks/                 # 事件钩子
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
# 交互式初始化（6 阶段引导：项目检测 → AI 助手 → 预设 → 元信息 → 输出配置 → 确认）
npx gforge init

# 非交互模式（CI/CD 友好）
npx gforge init --agent claude --preset vite-react --yes

# 多个 AI 助手同时配置
npx gforge init --agent claude,cursor --preset nextjs

# 已有项目：指定冲突策略
npx gforge init --conflict prompt    # 逐文件确认
npx gforge init --force              # 覆盖所有

# 校验规范
npx gforge validate

# 同步上下文
npx gforge context sync
```

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
| Claude Code | `--agent claude` | `CLAUDE.md` | `.claude/rules/` | 完整支持 |
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

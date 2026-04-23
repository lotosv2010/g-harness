# CLAUDE.md — Claude Code 专用配置

> 本文件为 Claude Code 的项目级指令文件，Claude Code 在此目录工作时自动加载。
> 通用 AI 规范见 `AGENTS.md`，本文件仅包含 Claude Code 特有的配置与行为指令。

---

## 语言规则

- 本项目所有回复、文档、注释统一使用**中文**
- 此规则覆盖全局英文设置

---

## 项目概述

G-Forge 是一套 AI 驱动的工程化规范框架 + CLI 工具（Harness Engineering 范式），旨在通过结构化的规则、协议、模板和预设，引导 AI 在任意技术栈的项目中持续输出一致的、生产级的代码。

**G-Forge 是：**
- 一套通用规范文件集合（规则、协议、模板、Prompt）
- 一个 CLI 工具，将规范初始化、校验、同步到目标项目
- 一个预设系统，支持不同技术栈（React、Vue、Node.js 等）

**G-Forge 不是：**
- 一个含有 web/server 等业务包的应用
- 一个特定技术栈的框架
- 一个 Monorepo 运行时

## 技术栈（本项目自身）

- 语言：TypeScript（严格模式）
- 运行时：Node.js 20+
- 包管理：pnpm
- 测试：Vitest
- 代码质量：ESLint + Prettier
- 版本控制：Git + Conventional Commits

## 目录结构

```
g-forge/
├── AGENTS.md                  # 通用 AI 开发规范
├── CLAUDE.md                  # Claude Code 专用配置（本文件）
├── README.md                  # 项目说明
│
├── docs/                      # 约束与规格层
│   ├── SPEC.md                # 产品说明书 + 需求规格说明书
│   ├── ARCHITECTURE.md        # 架构白皮书
│   ├── DESIGN.md              # 技术 / UI 设计
│   ├── API.md                 # API 契约定义
│   ├── DATA_MODEL.md          # 数据模型规格
│   ├── decisions/             # 架构决策记录（ADR）
│   ├── runbooks/              # 运维操作手册
│   ├── team/
│   │   └── ROLES.md           # 角色分工与模块归属
│   └── tasks/
│       ├── BOARD.md           # 任务看板
│       └── CURRENT.md         # 活跃任务索引
│
├── .claude/                   # Claude 行为控制层
│   ├── rules/                 # 硬性规则
│   ├── protocols/             # 任务执行协议
│   ├── skills/                # 可复用能力模板
│   ├── prompts/               # AI 开发 Prompt（g-forge 专用）
│   ├── guardrails/            # 自动约束检查
│   └── hooks/                 # 事件钩子
│
├── tools/                     # 工具层
│   ├── prompts/               # 通用 Prompt（非 Claude 专用）
│   └── scripts/               # 自动化脚本（按需添加）
│
├── tests/                     # 全局测试（E2E 等）
│
└── src/                       # 业务代码（全部收纳于此）
    ├── core/                  # CLI 引擎（命令、扫描、生成、校验、迁移）
    │   ├── commands/          # CLI 命令入口
    │   ├── scanner/           # 项目扫描与检测
    │   ├── generator/         # 文件生成引擎
    │   ├── validator/         # 规范校验引擎
    │   └── migrator/          # 规范版本迁移
    ├── presets/               # 技术栈预设
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
        ├── AGENTS.template.md # → 目标项目 AGENTS.md
        └── CLAUDE.template.md # → 目标项目 CLAUDE.md
```

## 工作规则

### 上下文优先

每次执行任务前，按顺序读取：
1. 本文件（`CLAUDE.md`）
2. `AGENTS.md`（通用规范）
3. 相关 `docs/decisions/*.md`（架构决策）
4. `docs/tasks/CURRENT.md`（当前活跃任务）

### 执行协议

遵循 `.claude/protocols/` 中的任务执行协议：
- 功能开发 → `protocols/feature.md`
- Bug 修复 → `protocols/bugfix.md`
- 重构 → `protocols/refactor.md`
- 代码审查 → `protocols/review.md`

### 硬性规则

遵循 `.claude/rules/` 中的所有规则文件，这些规则不可违反。

### 安全约束

- 禁止读取或输出 `.env*` 文件内容
- 禁止在代码中硬编码任何密钥
- 破坏性操作必须先确认
- 不执行 `git commit`、`git push` 除非用户明确要求

### 代码风格

- 注释语言：中文
- 使用命名导出，非默认导出
- 类型使用 interface 优先
- 测试文件与源文件同级或在 `__tests__/` 目录

### 常用命令

```bash
pnpm install          # 安装依赖
pnpm build            # 构建 CLI
pnpm test             # 运行测试
pnpm lint             # 代码检查
pnpm typecheck        # 类型检查
```

## 关键区分

| 目录 | 用途 | 面向 | 特点 |
|------|------|------|------|
| `.claude/rules/` | 开发 g-forge 本身的规则 | 本项目 | 具体化，g-forge 特定 |
| `src/templates/.ai/rules/` | 输出给目标项目的规则 | 目标项目 | 通用化，带 `{{variable}}` 占位符 |
| `.claude/protocols/` | 开发 g-forge 本身的协议 | 本项目 | 具体化 |
| `src/templates/.ai/protocols/` | 输出给目标项目的协议 | 目标项目 | 通用化 |
| `src/templates/` | 所有可分发内容，1:1 镜像目标项目 | 目标项目 | 技术栈无关 |
| `src/presets/` | 技术栈预设，CLI init 时选择 | 目标项目 | 补充 templates 的栈特定内容 |

> **设计说明：**
> - 根 `.claude/` 是 g-forge 项目自身的具体规则（如引用 `src/core/`）。
> - `src/templates/.ai/` 是面向任意目标项目的通用版本（使用 `{{variable}}`）。
> - 模板源码使用 `.ai/` 命名以表达"AI 通用"语义，生成器输出时自动映射为 `.claude/`。

## 引用文件

- 通用规范：`AGENTS.md`
- 产品与需求规格：`docs/SPEC.md`
- 架构说明：`docs/ARCHITECTURE.md`
- 技术 / UI 设计：`docs/DESIGN.md`
- API 契约：`docs/API.md`
- 数据模型：`docs/DATA_MODEL.md`
- 任务看板：`docs/tasks/BOARD.md`
- 活跃任务：`docs/tasks/CURRENT.md`

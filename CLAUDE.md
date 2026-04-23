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
├── src/                    # CLI 工具源码
│   ├── cli/                # 命令入口（init, validate, context, migrate）
│   ├── core/               # 核心逻辑
│   │   ├── scanner/        # 项目扫描与检测
│   │   ├── generator/      # 文件生成引擎
│   │   ├── validator/      # 规范校验引擎
│   │   └── migrator/       # 规范版本迁移
│   └── utils/              # 通用工具函数
│
├── core/                   # 框架核心规范（技术栈无关）
│   ├── rules/              # 规则定义
│   ├── protocols/          # 执行协议
│   ├── prompts/            # Prompt 模板
│   └── guardrails/         # 护栏定义
│
├── presets/                # 技术栈预设
│   ├── react-vite/         # React + Vite 预设
│   └── _template/          # 预设创建模板
│
├── templates/              # 通用文件模板
│   ├── CLAUDE.template.md
│   ├── AGENTS.template.md
│   └── ...
│
├── docs/                   # 框架文档
├── tests/                  # 测试
├── .claude/                # Claude Code 行为控制（开发本项目用）
├── CLAUDE.md               # 本文件
├── AGENTS.md               # 通用 AI 规范
└── README.md               # 项目概览
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

| 目录 | 用途 | 面向 |
|------|------|------|
| `.claude/rules/` | 开发 g-forge 本身的规则 | 本项目开发者 |
| `core/rules/` | 框架输出给目标项目的规则 | 目标项目 |
| `.claude/protocols/` | 开发 g-forge 本身的协议 | 本项目开发者 |
| `core/protocols/` | 框架输出给目标项目的协议 | 目标项目 |
| `templates/` | 模板文件，CLI 渲染后输出 | 目标项目 |
| `presets/` | 技术栈预设，CLI init 时选择 | 目标项目 |

## 引用文件

- 通用规范：`AGENTS.md`
- 产品与需求规格：`docs/SPEC.md`
- 架构说明：`docs/ARCHITECTURE.md`
- API 规格：`docs/API_SPEC.md`
- 数据模型：`docs/DATA_MODEL.md`
- 任务看板：`docs/tasks/BOARD.md`
- 活跃任务：`docs/tasks/CURRENT.md`

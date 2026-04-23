# CLAUDE.md — Claude Code 专用配置

> 本文件为 Claude Code 的项目级指令文件，Claude Code 在此目录工作时自动加载。
> 通用 AI 规范见 `AGENTS.md`，本文件仅包含 Claude Code 特有的配置与行为指令。

---

## 项目概述

G-Forge 是一套 AI 驱动的前端工程化规范框架（Harness Engineering 范式），旨在通过结构化的上下文、约定、约束和工作流，引导 AI 持续输出一致的、生产级的代码。

## 技术栈

- 语言：TypeScript（严格模式）
- 运行时：Node.js 20+
- 包管理：pnpm + workspace
- 构建：Turbo（monorepo 编排）
- 测试：Vitest
- 代码质量：ESLint + Prettier
- 版本控制：Git + Conventional Commits

## 架构

Monorepo 结构，包含以下包：
- `packages/web/` — 前端应用
- `packages/server/` — 服务端应用
- `packages/ai/` — AI 能力层
- `packages/shared/` — 通用共享库

详见 `docs/ARCHITECTURE.md`。

## 工作规则

### 上下文优先

每次执行任务前，按顺序读取：
1. 本文件（`CLAUDE.md`）
2. `AGENTS.md`（通用规范）
3. 目标目录的 `CLAUDE.md`（如存在）
4. 相关 `docs/decisions/*.md`（架构决策）
5. `docs/tasks/CURRENT.md`（当前活跃任务）

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
- 破坏性操作（删除、重置、修改数据库）必须先确认
- 不执行 `git commit`、`git push` 除非用户明确要求

### 代码风格

- 注释语言：与代码库现有注释保持一致（自动检测）
- 使用命名导出，非默认导出
- 组件使用函数式声明
- 类型使用 interface 优先
- 测试文件与源文件同级或在 `__tests__/` 目录

### 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器
pnpm build            # 构建所有包
pnpm test             # 运行测试
pnpm lint             # 代码检查
pnpm typecheck        # 类型检查
```

## 模块地图

```
packages/
├── web/               # 前端应用（React + Vite）
├── server/            # 服务端（Node.js）
├── ai/                # AI 能力封装
└── shared/            # 共享类型、工具函数

docs/                  # 所有规格文档
.claude/               # Claude 行为控制
tools/                 # 脚本与 Prompt 模板
tests/                 # 全局 E2E 测试
```

## 引用文件

- 通用规范：`AGENTS.md`
- 产品范围：`docs/PRODUCT.md`
- 架构白皮书：`docs/ARCHITECTURE.md`
- API 契约：`docs/API_SPEC.md`
- 数据模型：`docs/DATA_MODEL.md`
- 任务看板：`docs/tasks/BOARD.md`
- 活跃任务：`docs/tasks/CURRENT.md`
- 角色分工：`docs/team/ROLES.md`

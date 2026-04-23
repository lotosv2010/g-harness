# G-Forge 框架审查报告

> 日期：2026-04-23
> 范围：目录结构、内容一致性、框架定位

---

## 核心发现：身份定位错位

G-Forge 将自身定位为**通用规范框架**（"前端、后端、任何项目皆适用"），但当前的结构和内容却是按照一个**具体的 Monorepo 应用**来搭建的。这是以下大部分问题的根本原因。

---

## 1. `packages/` 目录 — 应当移除

**问题：** `packages/web/`、`packages/server/`、`packages/ai/`、`packages/shared/` 中仅有 `.gitkeep` 占位文件，暗示这是一个应用项目。但 g-forge 是一个**规范框架**——它的交付物是规范文件本身，而非可运行的代码。

**建议：** 整体移除 `packages/`。如果 g-forge 未来需要 CLI 工具来做脚手架或校验，届时再引入专门的结构（如 `src/` 用于 CLI 工具本身，而非 `packages/web/server`）。

**影响：** CLAUDE.md、ARCHITECTURE.md、ADR、规则和技能中均引用了 `packages/*`——它们需要被重新定义为**示例或模板**，面向目标项目，而非 g-forge 自身的结构。

---

## 2. CLAUDE.md — 框架配置与示例项目配置混杂

**当前问题：**

| 章节 | 问题 |
|------|------|
| 技术栈 | 列出了 React 19、Vite 6、Hono、SQLite —— 这些是目标项目的技术栈，不是框架本身的 |
| 模块地图 | 展示 `packages/web/server/ai/shared` 作为框架自身的结构 |
| 常用命令 | `pnpm dev`、`pnpm build` —— 是目标项目的命令，非规范框架的命令 |
| 架构规则引用 | 指向 A001-A006 作为硬性规则，但这些是目标项目的示例规则 |

**建议：** 拆分为两个清晰的层次：
1. **框架级 CLAUDE.md** —— 描述 g-forge 本身（规范框架、文件结构、如何贡献规范）
2. **模板 CLAUDE.md** —— g-forge 为目标项目生成的 CLAUDE.md（包含技术栈、模块地图、命令等）

---

## 3. 架构规则（`.claude/rules/`）—— 应为模板，而非硬性规则

**问题：** 像 A001（模块边界：`packages/shared ← packages/ai ← packages/web`）这样的规则特定于某种 Monorepo 布局，不适用于：
- Python 后端项目
- 单包前端应用
- 微服务架构

**建议：**
- 将 `.claude/rules/` 重命名为 `templates/rules/` 或 `examples/rules/`
- 增加规则模板系统，支持变量（如 `{{packages}}`、`{{api_layer}}`）
- 保留一小组真正通用的规则（安全规则 S001-S005 基本通用）
- 架构和代码质量规则应**可按目标项目定制**

---

## 4. Skills — 过于特定于某一技术栈

**问题：**
- `scaffold/SKILL.md` —— 硬编码了 React 组件结构、特定的目录约定
- `test-gen/SKILL.md` —— 硬编码了 Vitest + Testing Library、React 组件测试模式
- `analyze/SKILL.md` —— 硬编码了特定的模块边界预期

**建议：**
- Skills 应基于**模板 + 框架检测**
- 支持多种预设：`react-vite`、`vue-nuxt`、`next`、`node-api`、`python-fastapi` 等
- Skill 读取目标项目的配置来决定应用哪种模式

---

## 5. `docs/` 目录 — 需要重构

**当前结构混杂了框架文档和目标项目模板：**

```
docs/
├── API_SPEC.md          # 描述 g-forge CLI API — 框架文档 ✓
├── ARCHITECTURE.md      # 混杂框架架构 + 目标项目架构 ✗
├── DATA_MODEL.md        # 描述 g-forge 数据模型 — 框架文档 ✓
├── PRODUCT.md           # 描述 g-forge 产品 — 框架文档 ✓
├── decisions/           # 关于 g-forge 本身的 ADR — 框架文档 ✓
├── runbooks/            # g-forge 部署 — 框架文档 ✓
├── tasks/               # 任务跟踪 — 框架文档 ✓
└── team/                # 团队角色 — 归属存疑
```

**建议：**
1. **`docs/team/ROLES.md`** —— 角色定义是项目团队特有的，应移至 `templates/` 作为模板文件
2. **`docs/ARCHITECTURE.md`** —— 拆分为框架架构（五层 Harness 模型）和目标项目的架构模板
3. 增加明确的 `templates/` 或 `presets/` 目录，存放所有面向目标项目的内容

---

## 6. Protocols — 整体良好，存在小问题

**做得好的地方：** 四个协议（feature、bugfix、refactor、review）结构清晰，相对技术栈无关。

**问题：**
- `feature.md` 第三阶段引用了 "packages/web/src/features/" —— 过于具体
- `review.md` 架构维度引用了特定的模块边界
- 协议假定了特定的 Git 工作流，未考虑其他方案

**建议：** 将硬编码路径替换为占位变量，如 `{{feature_dir}}`、`{{api_dir}}`，由目标项目的配置来解析。

---

## 7. `tools/prompts/` — 概念好，需泛化

**做得好的地方：** Bug 报告、代码审查、功能开发、重构的 Prompt 模板是很好的想法。

**问题：**
- 模板中引用了特定的文件结构（如 `packages/`、`src/features/`）
- 没有机制让目标项目自定义这些模板

**建议：** 增加变量/占位符系统，使模板能适配目标项目。

---

## 8. `.claude/memory/` — 与 Claude Code 记忆系统冲突

**问题：** Claude Code 有自己的记忆系统，位于 `~/.claude/projects/<project>/memory/`。在仓库中放 `.claude/memory/` 会造成哪个记忆系统为准的混淆。

**建议：** 从仓库中移除 `.claude/memory/`。如需在 Git 中提交项目级上下文，使用 `.claude/context/` 或类似命名（区别于 Claude Code 的用户级记忆）。

---

## 9. AGENTS.md 与 CLAUDE.md — 内容重叠与混淆

**问题：** 两个文件包含重叠的指令：
- 都定义了代码质量规则
- 都定义了安全规则
- 都描述了架构约束
- AI 代理无法明确两者的关系

**建议：**
- `CLAUDE.md` —— 仅包含 Claude Code 特有的配置（工具权限、执行行为、文件引用）
- `AGENTS.md` —— 任何 AI 工具都可遵循的通用规范（规则、约定、架构）
- 移除所有重复内容 —— CLAUDE.md 应引用 AGENTS.md，而非复述

---

## 10. 缺失：框架自身定义

**问题：** 项目中没有任何地方清晰描述 **g-forge 本身是什么 vs 它为目标项目生成什么**。这是全局身份混淆的根源。

**建议：** 添加清晰的框架定义文档或章节：

```
G-Forge 是：
  - 一套规范文件集合（规则、协议、模板、Prompt）
  - 一个约定框架，被复制/适配到目标项目中
  - （未来）一个用于脚手架和校验的 CLI 工具

G-Forge 不是：
  - 一个含有 web/server/ai 包的应用
  - 一个 Monorepo 运行时
  - 一个特定的技术栈
```

---

## 建议的新目录结构

> 定位：**通用规范框架 + CLI 工具**

```
g-forge/
├── .claude/                    # Claude Code 行为控制（框架开发用）
│   ├── rules/                  # 开发 g-forge 本身的规则（极简）
│   ├── protocols/              # g-forge 贡献者的协议
│   ├── guardrails/             # g-forge 开发的护栏
│   ├── hooks/                  # Claude Code 钩子
│   ├── skills/                 # Claude Code 技能
│   └── settings.local.json
│
├── src/                        # CLI 工具源码
│   ├── cli/                    # 命令入口（init, validate, context, migrate）
│   ├── core/                   # 核心逻辑
│   │   ├── scanner/            # 项目扫描与检测（技术栈、结构）
│   │   ├── generator/          # 文件生成引擎（模板渲染）
│   │   ├── validator/          # 规范校验引擎
│   │   └── migrator/           # 规范版本迁移
│   ├── utils/                  # 通用工具函数
│   └── index.ts                # 入口
│
├── core/                       # 框架核心规范文件（CLI 读取此目录）
│   ├── rules/                  # 规则定义（技术栈无关，参数化）
│   │   ├── safety.md           # 通用安全规则
│   │   ├── code-quality.md     # 通用质量规则
│   │   └── architecture.md     # 架构规则模板
│   ├── protocols/              # 执行协议
│   │   ├── feature.md
│   │   ├── bugfix.md
│   │   ├── refactor.md
│   │   └── review.md
│   ├── prompts/                # Prompt 模板
│   │   ├── bug-report.md
│   │   ├── code-review.md
│   │   ├── feature-dev.md
│   │   └── refactor.md
│   └── guardrails/             # 护栏定义
│       ├── boundary-check.md
│       └── pre-commit.md
│
├── presets/                    # 技术栈特定预设（CLI init 时选择）
│   ├── react-vite/             # React + Vite 预设
│   │   ├── CLAUDE.template.md
│   │   ├── rules/
│   │   └── skills/
│   ├── vue-nuxt/               # Vue + Nuxt 预设（未来）
│   ├── node-api/               # Node.js API 预设（未来）
│   ├── python-fastapi/         # Python FastAPI 预设（未来）
│   └── _template/              # 预设创建模板
│
├── templates/                  # 通用文件模板（CLI 渲染后输出到目标项目）
│   ├── CLAUDE.template.md      # 基础 CLAUDE.md 模板
│   ├── AGENTS.template.md      # 基础 AGENTS.md 模板
│   ├── ROLES.template.md       # 团队角色模板
│   ├── ADR.template.md         # 架构决策模板
│   └── BOARD.template.md       # 任务看板模板
│
├── docs/                       # G-Forge 框架文档
│   ├── PRODUCT.md              # 产品规格
│   ├── ARCHITECTURE.md         # 框架架构（五层模型）
│   ├── DATA_MODEL.md           # 数据模型
│   ├── API_SPEC.md             # CLI 命令与 API 规格
│   ├── CONTRIBUTING.md         # 贡献指南
│   ├── decisions/              # 架构决策记录
│   ├── runbooks/               # 运维手册
│   └── tasks/                  # 任务跟踪
│
├── tests/                      # 测试
│   ├── unit/                   # 单元测试（validator、generator 等）
│   ├── integration/            # 集成测试（CLI 端到端）
│   └── fixtures/               # 测试用的模拟项目结构
│
├── scripts/                    # 开发脚本
│
├── package.json                # CLI 包配置（bin: gforge）
├── tsconfig.json
├── CLAUDE.md                   # g-forge 开发的 Claude Code 配置
├── AGENTS.md                   # g-forge 开发的 AI 规范
└── README.md                   # 项目概览
```

---

## 优先级总结

| 优先级 | 问题 | 影响 |
|--------|------|------|
| **P0** | 移除 `packages/` — 框架不是应用 | 消除核心身份混淆 |
| **P0** | 拆分框架自身 vs 目标项目模板内容 | 使框架真正可复用 |
| **P1** | 重构为 `core/` + `presets/` + `templates/` | 支持多技术栈 |
| **P1** | 解决 CLAUDE.md / AGENTS.md 内容重叠 | 更清晰的 AI 指令层级 |
| **P1** | 从仓库移除 `.claude/memory/` | 避免与 Claude Code 系统冲突 |
| **P2** | 参数化规则和协议 | 使规范技术栈无关 |
| **P2** | 增加不同技术栈的预设系统 | 兑现"任何项目适用"的承诺 |
| **P2** | 泛化 Skills，支持模板变量 | Skills 跨技术栈工作 |

---

## 下一步

> 已确认定位：**通用规范 + CLI 工具**

1. **P0 — 结构重构：** 移除 `packages/`，建立 `src/`（CLI）+ `core/`（规范）+ `presets/`（预设）+ `templates/`（模板）
2. **P0 — 内容分离：** 将当前 CLAUDE.md、rules、protocols 中的目标项目示例内容迁移到 `templates/` 和 `presets/`
3. **P1 — CLI 基础：** 搭建 CLI 骨架（`gforge init`、`gforge validate`），实现模板渲染引擎
4. **P1 — 规范参数化：** 为规则和协议引入变量系统，支持多技术栈
5. **P2 — 预设开发：** 完成第一个预设（react-vite），验证端到端流程
6. **P2 — 文档更新：** 更新 ARCHITECTURE.md、PRODUCT.md 等反映新定位

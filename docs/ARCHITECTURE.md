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
    ├── cli/                   # CLI 命令入口
    ├── core/                  # 核心逻辑模块
    │   ├── scanner/           # 项目扫描与技术栈检测
    │   ├── generator/         # 模板渲染与文件生成
    │   ├── validator/         # 规范校验引擎
    │   └── migrator/          # 规范版本迁移
    ├── utils/                 # 通用工具函数
    ├── content/               # 可分发的框架规范内容（技术栈无关）
    │   ├── rules/             # 规则定义
    │   ├── protocols/         # 执行协议
    │   ├── prompts/           # Prompt 模板
    │   └── guardrails/        # 护栏定义
    ├── presets/               # 技术栈特定预设
    └── templates/             # 通用文件模板（CLI 渲染后输出）
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

### 3.5 src/content/ — 框架核心规范

存放技术栈无关的规范文件，由 CLI 工具读取并应用到目标项目。

```
src/content/
├── rules/                 # 通用规则（安全、代码质量、架构模板）
├── protocols/             # 执行协议（功能开发、Bug 修复、重构、审查）
├── prompts/               # Prompt 模板（Bug 报告、代码审查、功能开发、重构）
└── guardrails/            # 护栏定义（边界检查、提交前检查）
```

### 3.6 src/presets/ — 技术栈预设

每个预设补充通用规范，提供技术栈特定的规则、技能和模板。

```
src/presets/<name>/
├── preset.json            # 预设元数据（技术栈、变量值、命令）
├── rules/                 # 栈特定规则
└── skills/                # 栈特定技能
```

### 3.7 src/templates/ — 文件模板

CLI `init` 命令读取模板，结合预设变量渲染后输出到目标项目。

```
src/templates/
├── CLAUDE.template.md     # 基础 CLAUDE.md 模板
├── AGENTS.template.md     # 基础 AGENTS.md 模板
├── ROLES.template.md      # 团队角色模板
├── ADR.template.md        # 架构决策模板
└── BOARD.template.md      # 任务看板模板
```

## 4. 数据流

```
用户运行 gforge init --preset react-vite
         │
         ▼
   CLI 解析命令参数
         │
         ▼
   Scanner 扫描目标项目
   （检测技术栈、目录结构、现有配置）
         │
         ▼
   加载预设（src/presets/react-vite/preset.json）
   加载模板（src/templates/*.template.md）
   加载规范（src/content/rules/*.md）
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
| ADR-001 | 单包结构 + CLI-first | 框架定位是规范工具，不需要 monorepo |
| ADR-002 | YAML 作为规则定义格式 | 人和 AI 都可读写，比 JSON 更易维护 |
| ADR-003 | 自研变量替换替代 Handlebars | `{{var}}` 足够简单，避免引入重依赖 |
| ADR-004 | content/ 与 presets/ 分离 | 通用规范技术栈无关，预设补充特定规则 |
| ADR-005 | 预设系统（Presets） | 不同框架开箱即用，减少配置成本 |

详细 ADR 记录见 `docs/decisions/` 目录。

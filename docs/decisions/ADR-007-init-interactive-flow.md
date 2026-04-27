---
id: ADR-007
status: proposed
date: 2026-04-24
superseded_by: null
---

# 重设计 g-harness init 交互流程

## 背景

当前 `g-harness init` 的交互流程是线性的：选 Agent → 扫描 → 自动推断预设 → 生成。
这个流程存在几个问题：

1. **不区分新建项目和已有项目**：两种场景的用户心智模型完全不同——新建项目想"给我最佳实践"，已有项目想"别破坏我现有的东西"
2. **无冲突策略交互**：老项目接入时，已有 `CLAUDE.md` 或 `.cursorrules` 等文件会被静默跳过，用户没有选择权
3. **无输出层级交互**：核心层/完整层只有 `--full` flag，交互中不可选
4. **无项目元信息收集**：项目名、描述等模板变量在交互中无来源
5. **无确认预览**：用户看不到"将要生成什么"的汇总就直接执行了
6. **市场差距**：`create-next-app`、`npm create vite`、`nx init` 等主流工具都有精心设计的交互引导

期望：让 `g-harness init` 的交互体验达到市场一线 CLI 工具水准，同时体现 Harness Engineering 的渐进式接入思想。

## 决策

采用**阶段式交互引导（Staged Interactive Wizard）**模式，根据项目状态（新建 vs 已有）动态调整交互步骤。

## 备选方案

### 方案 A：阶段式交互引导（推荐）

将 init 流程分为 6 个阶段，每个阶段由 `@clack/prompts` 的交互组件驱动，根据上下文动态裁剪步骤：

```
┌─────────────────────────────────────────────────────────┐
│  g-harness init                                            │
│                                                         │
│  Stage 1: 项目检测                                      │
│  ├─ 扫描 cwd（package.json? git? 现有 AI 配置?）        │
│  ├─ 判定：新建项目 / 已有项目 / 已接入 G-Harness          │
│  └─ 已接入 → 建议 g-harness context sync                  │
│                                                         │
│  Stage 2: AI 助手选择                                   │
│  ├─ multiselect 选择 agent（复用现有逻辑）              │
│  └─ 检测到现有 AI 配置时预选对应 agent                  │
│                                                         │
│  Stage 3: 技术栈 & 预设                                 │
│  ├─ 已有项目 → 自动扫描推荐 + 用户确认/修正            │
│  ├─ 新建项目 → 列表选择预设                            │
│  └─ 无匹配 → 使用 base                                 │
│                                                         │
│  Stage 4: 项目元信息                                    │
│  ├─ 项目名（从 package.json 或目录名推断，可修改）     │
│  ├─ 项目描述（从 package.json 推断，可修改）           │
│  └─ 源码目录（从扫描推断，可修改）                     │
│                                                         │
│  Stage 5: 输出配置                                      │
│  ├─ 输出层级：核心层 / 完整层                          │
│  ├─ 冲突策略：跳过已有 / 覆盖 / 合并（仅已有项目）    │
│  └─ 附加选项：是否安装 pre-commit hook                 │
│                                                         │
│  Stage 6: 确认 & 执行                                   │
│  ├─ 汇总预览（将生成的文件树 + 变量值）                │
│  ├─ 用户确认                                            │
│  └─ 执行生成                                            │
└─────────────────────────────────────────────────────────┘
```

**动态裁剪规则：**

| 条件 | 裁剪行为 |
|------|----------|
| 空目录（无 package.json） | 跳过 Stage 3 扫描推荐，直接展示预设列表 |
| 已有项目但未接入 G-Harness | 完整 6 阶段 |
| 已接入 G-Harness（检测到 CLAUDE.md + .claude/） | 提示"已接入"并建议 `g-harness context sync`，用户可选择继续 reinit |
| `--preset` 已指定 | 跳过 Stage 3 |
| `--agent` 已指定 | 跳过 Stage 2 |
| 非交互环境（CI/piped stdin） | 全部用默认值，等同 `--agent claude --preset base` |

- 优点：用户体验好，贴近 create-next-app 等一线工具；根据项目状态智能裁剪步骤不冗余；冲突策略给用户选择权；确认预览让用户心里有底
- 缺点：交互步骤多，需控制总耗时在 30 秒内；实现复杂度较高

### 方案 B：极简两步式

只保留两个交互：Agent 选择 + 预设选择，其余全自动。

- 优点：极简快速
- 缺点：老项目接入无法控制冲突策略；无确认预览；模板变量来源只靠自动推断

### 方案 C：配置文件驱动

首次运行生成 `.g-harnessrc.json`，后续 init 读取配置文件。

- 优点：CI 场景友好
- 缺点：增加用户学习成本；首次仍需要交互；与 `--preset` / `--agent` flag 语义重叠

## 详细设计

### Stage 1: 项目检测

自动运行（无用户交互），Scanner 增强后检测以下信号：

```typescript
interface ProjectDetection {
  // 项目成熟度
  isEmpty: boolean           // 空目录（无 package.json 且无其他源码文件）
  hasPackageJson: boolean
  hasGit: boolean
  
  // G-Harness 接入状态
  hasHarnessConfig: boolean   // 任一 AI 配置文件存在
  harnessVersion: string | null  // 从 AGENTS.md 版本标记中读取
  existingAgents: string[]   // 已存在的 agent 配置（如 ['claude', 'cursor']）
  
  // 原有 ScanResult 保持不变
  techStack: TechStack
  structure: ProjectStructure
  existingConfig: ExistingConfig
}
```

**行为分支：**
- `isEmpty` → 输出提示"检测到空目录，将以新项目模式初始化"
- `hasHarnessConfig && harnessVersion` → 输出提示"检测到已接入 G-Harness（vX.X），建议使用 g-harness context sync 更新。继续 init 将重新生成配置。"，用户 confirm 是否继续
- 其他 → 正常继续

### Stage 2: AI 助手选择

复用现有 `selectAgents()` 逻辑，增强点：

- **智能预选**：如检测到 `.cursorrules` 存在，自动预选 `cursor`
- **能力对比提示**：选择非 Claude 的 agent 时，简要提示功能差异

### Stage 3: 技术栈 & 预设

```
◆  检测到技术栈：React 19 + Vite 6 + TypeScript
│  推荐预设：vite-react
│
│  ● 使用推荐预设 vite-react
│  ○ 选择其他预设
│  ○ 不使用预设（仅生成基础规范）
```

新建项目（无 package.json）则直接展示预设列表选择。

### Stage 4: 项目元信息

收集模板变量所需的项目信息：

| 字段 | 默认值推断 | 交互类型 |
|------|-----------|----------|
| 项目名 | `package.json#name` → 目录名 | text（可回车跳过用默认） |
| 项目描述 | `package.json#description` → 空 | text（可跳过） |
| 源码目录 | Scanner `srcDir` → `src` | text（可跳过） |

### Stage 5: 输出配置

```
◆  选择输出层级
│  ● 核心层（推荐）— 规则 + 协议 + 入口文件 + 架构文档
│  ○ 完整层 — 核心层 + 护栏 + 技能 + Prompt + 任务看板 + 运维手册
│
◆  已有文件冲突策略（仅已有项目显示）
│  ● 跳过已有文件（安全默认）
│  ○ 覆盖所有文件
│  ○ 逐个确认（适合精细控制）
│
◆  附加选项
│  ☑ 安装 pre-commit hook（提交前自动校验）
```

### Stage 6: 确认 & 执行

```
◆  即将生成以下文件：
│
│  AI 助手：Claude Code, Cursor
│  技术预设：vite-react
│  输出层级：核心层
│  冲突策略：跳过已有
│
│  📁 将创建 18 个文件：
│  ├── AGENTS.md
│  ├── CLAUDE.md
│  ├── .cursorrules
│  ├── .claude/rules/architecture.md
│  ├── .claude/rules/code-quality.md
│  ├── .claude/rules/safety.md
│  ├── .claude/protocols/feature.md
│  ├── .claude/protocols/bugfix.md
│  ├── .cursor/rules/architecture.md
│  ├── .cursor/rules/code-quality.md
│  ├── .cursor/rules/safety.md
│  ├── docs/ARCHITECTURE.md
│  ├── docs/SPEC.md
│  └── ...（+5 个文件）
│
│  确认生成？(Y/n)
```

### 非交互模式兼容

所有 flag 保持向后兼容，新增 flag：

| Flag | 说明 |
|------|------|
| `--name <name>` | 项目名（跳过 Stage 4 项目名交互） |
| `--conflict <strategy>` | 冲突策略：skip（默认）、overwrite、prompt |
| `--yes` / `-y` | 跳过确认，使用所有默认值 |

CI 场景完整命令示例：
```bash
g-harness init --agent claude --preset vite-react --yes
```

## 影响

### 正面影响
- 用户体验达到 create-next-app / create-vite 水准
- 新建项目和已有项目都有顺畅的接入路径
- 冲突策略给老项目用户安全感
- 确认预览让操作可预期
- 渐进式——核心层够用，完整层可选，体现 Harness Engineering 分层理念

### 负面影响 / 权衡
- 交互步骤 6 个，需确保总耗时 < 30 秒（通过智能默认值 + Enter 快速跳过）
- init-interactive.ts 模块会显著扩大，需拆分为多个函数保持可读性
- 需更新 GETTING_STARTED.md、README.md、SPEC.md 文档

## AI 指引

- 交互流程实现集中在 `src/core/commands/init-interactive.ts`，按 stage 拆分为独立函数
- `src/core/commands/init.ts` 作为编排入口，调用各 stage 函数
- `ProjectScanner` 增强通过扩展 `ScanResult` 接口实现，不破坏现有 API
- 冲突策略 `prompt`（逐个确认）在 `FileGenerator` 中实现，通过 callback 回调交互
- Stage 6 预览通过 `--dry-run` 的 `GenerateResult` 复用，先 dry-run 收集文件列表再展示
- 所有交互组件使用 `@clack/prompts`，保持 UI 一致性
- 非交互环境检测：`process.stdout.isTTY === false` 时自动使用默认值

# 快速开始

> 本指南帮助你在 5 分钟内将 G-Forge 接入任意项目。

---

## 前置条件

- Node.js >= 20.0.0
- 包管理器：pnpm / npm / yarn / bun 均可
- （可选）Git 已初始化的项目

---

## 1. 安装

```bash
# 全局安装
npm install -g gforge

# 或者直接用 npx（无需安装）
npx gforge init
```

---

## 2. 初始化项目

### 2.1 交互式初始化（推荐）

```bash
gforge init
```

G-Forge 通过 **6 阶段引导式 Wizard** 完成初始化，新建项目和已有项目都适用：

```
◆  Stage 1: 项目检测
│  检测到已有项目：React + Vite + pnpm
│
◆  Stage 2: 选择 AI 开发助手（空格选择，回车确认）
│  ● Claude Code（Anthropic）— 完整支持（规则/钩子/协议/技能）
│  ○ Cursor（Anysphere）— 支持规则
│  ○ Windsurf（Codeium）— 支持规则
│  ○ GitHub Copilot（GitHub）— 支持规则
│  ○ Trae（ByteDance）— 支持规则
│
◆  Stage 3: 检测到 React，推荐预设：vite-react
│  ● 使用推荐预设 vite-react
│  ○ 选择其他预设
│
◆  Stage 4: 项目元信息
│  项目名称: my-app
│  项目描述: （可跳过）
│  源码目录: src
│
◆  Stage 5: 输出配置
│  ● 核心层（推荐）
│  冲突策略: 跳过已有文件
│  ☑ 安装 pre-commit hook
│
◆  Stage 6: 确认预览
│  将创建 18 个文件...
│  确认生成？(Y/n)
```

**智能特性**：
- 自动检测已有项目的技术栈并推荐预设
- 检测到已有 AI 配置（如 `.cursorrules`）时自动预选对应 agent
- 已接入 G-Forge 的项目会提示使用 `gforge context sync`
- 所有步骤都有智能默认值，按回车即可快速通过

### 2.2 非交互式 — 指定参数

```bash
# CI/CD 友好：跳过所有交互
gforge init --agent claude --preset vite-react --yes

# 多个 AI 助手
gforge init --agent claude,cursor --preset nextjs

# 启用 LLM 内容增强（检测到 API key 才生效，失败透明降级）
export ANTHROPIC_API_KEY=sk-ant-...
gforge init --llm

# 已有项目：指定冲突策略
gforge init --conflict prompt     # 逐文件确认
gforge init --conflict overwrite  # 覆盖所有（等同 --force）

# 指定项目名
gforge init --name my-app --preset vanilla
```

### LLM 内容增强（v1.3）

G-Forge 默认使用**规则版**内容补全（关键词匹配 + 预设片段库），无外部依赖。若检测到 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 且启用 `--llm`（或在交互模式的 Stage 5 勾选），则用 LLM 改写三段叙述性内容：

| 字段 | 含义 | 白名单 |
|------|------|--------|
| `projectPositioning` | 项目定位一句话 | ✅ 可 LLM 覆盖 |
| `productBoundaries` | 产品边界（是什么 / 不是什么） | ✅ 可 LLM 覆盖 |
| `moduleBreakdown` | 模块清单叙述 | ✅ 可 LLM 覆盖 |
| 其他字段（表格 / NFR / 目录） | — | ❌ 保持规则版 |

任何失败（超时 / 网络错误 / JSON 解析错误 / 返回空）都会**透明降级**到规则版，不会中断 init 流程。

### 2.5 Deep Agent 模式（v1.4）

`--deep-agent` 启用基于 **LangGraph.js + `deepagents`** 的自主规范生成。Agent 读取项目（索引优先 → package → README → 按深度 list_dir / read_file / grep），再由 4 位专职子作家（`spec-writer` / `architecture-writer` / `rules-writer` / `entry-writer`）产出完整规范。

**安装 optional 依赖：**

```bash
pnpm add -D deepagents @langchain/core @langchain/langgraph @langchain/anthropic @langchain/openai zod
export ANTHROPIC_API_KEY=sk-ant-...   # 或 OPENAI_API_KEY
```

**三档分析深度：**

| Depth | 工具集 | 目标 token | 耗时 | 适用场景 |
|-------|-------|----------|------|---------|
| `shallow` | index + package + README | ≤15k | ~20s | 新项目 / 有完整索引的老项目 |
| `medium`（默认） | shallow + list_dir + read_file | ≤50k | ~40s | 一般老项目，需抽样理解 |
| `deep` | medium + grep + 全量反演 | ≤150k | ~90s | 架构反演、大型遗留项目 |

**CLI 示例：**

```bash
gforge init --deep-agent --depth medium --yes
gforge init --deep-agent --depth deep         # 交互模式下选择 deep 会显示实时预估

# 显式指定模型（ADR-011）
gforge init --deep-agent --depth deep --model claude-sonnet-4-5 --yes
gforge init --llm --model gpt-4o-mini --yes   # 窄增强路径也支持 --model
```

**模型 / Key 交互选择（ADR-011）：**

- 交互模式：选定 `llm-enhance` / `deep-agent` 后依次选 **Provider（Anthropic / OpenAI）→ Model（按 depth 标注推荐）→ API Key**。env 已设则跳过 key 输入；未设则 `p.password()` 交互输入（仅本次会话使用，不写盘）。
- 非交互模式：`--model <id>` 覆盖默认映射；`--provider` 可显式指定；`--api-key <key>` 显式传入（⚠️ 会进入 shell history，运行时 CLI 会打印黄色警告；生产环境优先用 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 环境变量）。

```bash
# 推荐：env 传递 key
export ANTHROPIC_API_KEY=sk-ant-...
gforge init --deep-agent --depth deep --model claude-sonnet-4-5 --yes

# 临时覆盖（会触发 shell history 警告）
gforge init --llm --provider openai --model gpt-4o --api-key sk-... --yes
```

| Provider | 模型选项 | 推荐档位 |
|---|---|---|
| Anthropic | `claude-haiku-4-5`（$1/$5） | shallow / medium |
| Anthropic | `claude-sonnet-4-5`（$3/$15） | deep |
| OpenAI | `gpt-4o-mini`（$0.15/$0.6） | shallow / medium |
| OpenAI | `gpt-4o`（$2.5/$10） | deep |

**产出文件白名单**（Agent 只能写这 10 份，越界输出被丢弃）：

- `AGENTS.md` / `CLAUDE.md`
- `docs/SPEC.md` / `docs/ARCHITECTURE.md` / `docs/decisions/ADR-001-architecture-baseline.md`
- `.claude/rules/{architecture,code-quality,safety}.md`
- `.claude/protocols/feature.md`
- `.claude/guardrails/boundary-rules.json`

**三级降级链**：`deep-agent → llm-enhance → template`。任一级失败（依赖缺失 / 无 API key / 超时 / token 超限 / 解析失败 / 网络错误）自动下沉，主流程永不崩溃。

**可观测性**：每次运行写入 `docs/.gforge/agent-trace-{ts}.jsonl`，末尾 summary 行记录步数 / token / 费用 / 降级原因；Stage 6 预览展示预计成本与耗时。

### 2.3 已有项目 — 自动扫描

```bash
gforge init --scan
```

G-Forge 会扫描 `package.json`、目录结构和配置文件，自动选择最匹配的预设。交互模式下，Stage 3 会展示推荐结果供你确认或修正。

### 2.3 预览模式

不确定会生成什么？先预览：

```bash
gforge init --preset vite-react --dry-run
```

### 2.4 完整输出

默认 `gforge init` 只输出核心文件（上下文 + 约束层）。添加 `--full` 输出完整文档体系：

```bash
gforge init --preset vite-react --full
```

**核心层（默认，以 Claude Code 为例）：**

```
AGENTS.md                    # 通用 AI 开发规范（所有 agent 共用）
CLAUDE.md                    # Claude Code 入口配置
.claude/rules/*.md           # 硬性规则
.claude/protocols/*.md       # 任务执行协议
.claude/hooks/*.mjs          # 自动检查钩子
.claude/settings.json        # 钩子注册配置
docs/ARCHITECTURE.md         # 架构文档
docs/SPEC.md                 # 产品说明书
```

> 选择其他 AI 助手时，入口文件和配置目录会自动适配（如 Cursor → `.cursorrules` + `.cursor/rules/`）。

**完整层（--full 追加）：**

```
.claude/guardrails/*.md      # 自动约束检查
.claude/prompts/*.md         # AI 开发 Prompt
.claude/skills/**/*.md       # 可复用能力模板
docs/DESIGN.md               # 技术设计
docs/API.md                  # API 契约
docs/DATA_MODEL.md           # 数据模型
docs/decisions/              # 架构决策记录
docs/tasks/                  # 任务看板
docs/team/                   # 角色分工
docs/runbooks/               # 运维手册
tools/                       # 工具与脚本
tests/                       # 测试基础结构
```

---

## 3. 渐进式采纳

不需要一次性接入所有功能。推荐按阶段逐步引入：

| 阶段 | 时间 | 操作 | 效果 |
|------|------|------|------|
| 1 | 第 1 天 | `gforge init`（仅核心层） | AI 立即理解项目结构和约束 |
| 2 | 第 1 周 | 按团队需求调整 `.claude/rules/` | AI 输出符合团队规范 |
| 3 | 第 2 周 | 启用钩子（`settings.json` 已配置） | 实时阻止架构违规 |
| 4 | 持续 | `gforge init --full` 补充完整文档 | 全面工程治理 |

---

## 4. 日常使用

### 4.1 校验规范

```bash
# 全量校验
gforge validate

# 仅校验暂存区文件（推荐在 pre-commit 中使用）
gforge check --staged

# 自动修复可修复的问题
gforge validate --fix

# JSON 格式输出（CI 集成）
gforge validate --format json --severity error
```

**内置校验规则：**

| 规则 | 严重度 | 说明 | 可自动修复 |
|------|--------|------|------------|
| R001 | error | 禁止 `any` 和 `@ts-ignore` | `@ts-ignore` → `@ts-expect-error` |
| R002 | warning | 禁止默认导出 | `export default` → 命名导出 |
| R003 | error | 禁止空 catch 块 | 添加 TODO 注释 |
| R005 | error/warning | 文件长度限制 | — |
| R006 | warning | 函数复杂度 | — |
| R007 | error | 禁止硬编码密钥 | — |
| A003 | warning | API 层集中 | — |

### 4.2 同步上下文

项目结构变化后，同步 CLAUDE.md：

```bash
# 自动更新 CLAUDE.md（技术栈、模块地图）
gforge context sync

# 检查一致性（不修改）
gforge context check
```

### 4.3 项目索引（v1.3）

让 AI 改动前先读索引，而不是广度扫描整个仓库 —— 这是降低 token 消耗、减少幻觉的关键。

```bash
# 首次生成三个索引文件
gforge index
# → docs/PROJECT_MAP.md   （模块清单 → 文件路径）
# → docs/FEATURES.md      （功能清单 → 入口文件）
# → docs/ROUTES.md        （路由表 → handler）

# 监听模式：src/ 变化时 500ms 防抖增量刷新
gforge index --watch

# 漂移检测：对比索引 vs 实际代码，CI 友好
gforge index --check
# → 识别 added / removed / dangling 三类漂移
# → 发现漂移时 exit 1
```

**协议硬化：** CLAUDE.md 与 feature / bugfix 协议阶段 1 已明确要求 AI 必须优先阅读 `PROJECT_MAP.md` / `FEATURES.md` / `ROUTES.md`，禁止未读索引就整库扫描。

**路由识别支持：** Next.js App Router / Pages Router、Nuxt、Express、React Router、Vue Router。

### 4.4 版本迁移

G-Forge 升级后，迁移项目配置：

```bash
# 自动迁移
gforge migrate

# 预览迁移方案
gforge migrate --dry-run

# 指定版本区间
gforge migrate --from 0.1 --to 0.2
```

---

## 5. 自定义

### 5.1 修改规则

所有规则在 `.claude/rules/` 目录下，直接编辑即可。

```markdown
# .claude/rules/my-rule.md

## MR001：禁止使用 console.log

生产代码中禁止使用 console.log，改用项目日志库。
```

### 5.2 添加协议

在 `.claude/protocols/` 中添加自定义开发协议：

```markdown
# .claude/protocols/deploy.md

# 部署协议

## 阶段 1：预检查
- [ ] 所有测试通过
- [ ] lint 检查通过
- [ ] 版本号已更新

## 阶段 2：构建
- [ ] 生产环境构建成功
- [ ] 构建产物大小合理

## 阶段 3：发布
- [ ] 更新 CHANGELOG
- [ ] 创建 Git Tag
```

### 5.3 自定义护栏

编辑 `.claude/guardrails/boundary-rules.json` 调整边界检查规则：

```json
{
  "rules": [
    {
      "id": "B001",
      "name": "共享层隔离",
      "description": "shared 模块不可导入 feature 模块",
      "pattern": "from.*features/",
      "scope": "shared",
      "severity": "error"
    }
  ]
}
```

---

## 6. CI 集成

### GitHub Actions

```yaml
name: G-Forge Validate
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g gforge
      - run: gforge validate --format json --severity error
```

### Pre-commit Hook

`gforge init` 会自动安装 pre-commit hook（如果 `.git/` 存在）。hook 在提交前运行 `gforge validate`，阻断不合规的代码提交。

---

## 7. 常见问题

### 初始化时已有文件怎么办？

默认跳过已有文件。使用 `--force` 强制覆盖：

```bash
gforge init --preset vite-react --force
```

### 预设选错了怎么办？

重新初始化并用 `--force` 覆盖：

```bash
gforge init --preset vite-vue --force
```

### 不使用 Claude Code 可以用吗？

可以。G-Forge 原生支持 Claude Code、Cursor、Windsurf、GitHub Copilot、Trae 五种 AI 助手，以及兼容任意 agent 的通用模式。初始化时选择对应的 AI 助手即可：

```bash
gforge init --agent cursor    # Cursor 用户
gforge init --agent copilot   # GitHub Copilot 用户
gforge init --agent generic   # 其他 AI 工具（仅生成 AGENTS.md）
```

注意：钩子、协议、技能等高级功能目前仅 Claude Code 支持，其他 agent 仅生成规则文件。

### 如何卸载 G-Forge？

删除生成的文件即可。G-Forge 不修改 `package.json`、不安装运行时依赖，删除后项目功能不受任何影响。

---

## 下一步

- 查看 [架构说明](docs/ARCHITECTURE.md) 了解五层架构设计
- 查看 [产品说明书](docs/SPEC.md) 了解完整需求
- 查看 [API 文档](docs/API.md) 了解 CLI 和 Node.js API 细节

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

G-Forge 会引导你选择 AI 助手和技术栈预设：

```
◆  选择你的 AI 开发助手（空格选择，回车确认）
│  ● Claude Code（Anthropic）— 完整支持（规则/钩子/协议/技能）
│  ○ Cursor（Anysphere）— 支持规则
│  ○ Windsurf（Codeium）— 支持规则
│  ○ GitHub Copilot（GitHub）— 支持规则
│  ○ Trae（ByteDance）— 支持规则
│  ○ 通用模式（兼容所有 agent）— 仅生成 AGENTS.md
```

支持多选——团队中不同成员用不同 AI 工具时，一次 init 全部搞定。

### 2.2 非交互式 — 指定参数

```bash
# 指定 AI 助手 + 预设
gforge init --agent claude --preset nextjs

# 多个 AI 助手
gforge init --agent claude,cursor --preset vite-react

# 纯 HTML + JS 项目
gforge init --agent cursor --preset vanilla
```

### 2.3 已有项目 — 自动扫描

```bash
gforge init --scan
```

G-Forge 会扫描 `package.json`、目录结构和配置文件，自动选择最匹配的预设。

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

### 4.3 版本迁移

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

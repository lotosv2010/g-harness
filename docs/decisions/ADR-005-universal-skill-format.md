# ADR-005：Skills 通用 Frontmatter 格式

## 状态

已采纳 — 2026-04-24

## 背景

当前 `.claude/skills/` 中的 SKILL.md 文件使用 Claude Code 专用的 frontmatter 字段（`allowed-tools`、`context`、`agent`），导致其他 AI 编程工具（Cursor、Windsurf、Copilot 等）无法解析和使用。

## 决策

将 SKILL.md frontmatter 分为**通用层**和**工具扩展层**：

- 通用层：所有 AI 工具都能解析的标准字段
- 扩展层：通过 `extensions.<tool>` 命名空间隔离工具专用配置

### 通用字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 技能标识符（kebab-case） |
| `description` | string | 是 | 一句话描述 |
| `triggers` | string[] | 是 | 触发关键词列表 |
| `invocable` | boolean | 否 | 是否可由用户主动调用（默认 true） |
| `arguments` | object[] | 否 | 参数列表 |
| `arguments[].name` | string | 是 | 参数名 |
| `arguments[].hint` | string | 否 | 参数提示 |
| `arguments[].required` | boolean | 否 | 是否必填（默认 false） |
| `capabilities` | string[] | 否 | 所需能力（read、write、execute、search） |

### 工具扩展字段

```yaml
extensions:
  claude:
    allowed-tools: "Read Glob Grep Bash(...)"
    context: fork
    agent: Explore
  cursor:
    # Cursor 专有配置
```

### 变更映射

| 旧字段 | 新字段 |
|--------|--------|
| `when_to_use` | `triggers` |
| `user-invocable` | `invocable` |
| `argument-hint` | `arguments[].hint` |
| `allowed-tools` | `extensions.claude.allowed-tools` |
| `context` | `extensions.claude.context` |
| `agent` | `extensions.claude.agent` |

## 后果

- **正面**：Skill 文件可被任意 AI 工具解析通用部分，工具专有配置隔离不污染
- **负面**：已有 Claude Code 项目需迁移（通过 `gforge migrate` 处理）
- **注意**：Claude Code 解析器需同时兼容新旧格式

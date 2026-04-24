# ADR-006：模板变量 Schema

## 状态

已采纳 — 2026-04-24

## 背景

模板文件使用 `{{variable}}` 占位符，但变量来源分散在预设（preset.json）和生成器运行时逻辑中，预设开发者无法知道需要提供什么。

## 决策

明确变量的两个来源及完整清单。

### 来源 1：预设变量（preset.json → variables）

由预设开发者在 `preset.json` 的 `variables` 字段中定义。用于模板中的目录路径占位符。

| 变量 | 类型 | 必填 | 说明 | 使用位置 |
|------|------|------|------|----------|
| `shared_dir` | string | 是 | 共享/公共模块目录 | rules/architecture.md |
| `feature_dir` | string | 是 | 功能模块目录 | rules/architecture.md |
| `api_dir` | string | 是 | API 层目录 | rules/architecture.md |
| `core_dir` | string | 否 | 核心模块目录（暂无模板使用） | — |
| `app_dir` | string | 否 | 应用入口目录（暂无模板使用） | — |
| `shared_package` | string | 是 | 共享包路径 | rules/architecture.md |
| `core_package` | string | 是 | 核心包路径 | rules/architecture.md |
| `app_package` | string | 是 | 应用包路径 | rules/architecture.md |

### 来源 2：生成器运行时变量（FileGenerator.buildVariables()）

由 `FileGenerator` 在 `generate()` 时根据 `ScanResult` 和 `Preset` 自动构建。预设开发者无需关注。

| 变量 | 类型 | 来源 | 使用位置 |
|------|------|------|----------|
| `project_description` | string | preset.description | CLAUDE.template.md, SPEC.template.md |
| `tech_stack` | string（多行） | ScanResult.techStack 格式化 | CLAUDE.template.md, ARCHITECTURE.template.md, AGENTS.template.md |
| `architecture_overview` | string | preset.techStack 摘要 | CLAUDE.template.md, AGENTS.template.md, ARCHITECTURE.template.md |
| `code_style_rules` | string（多行） | preset.codeStyle 格式化 | CLAUDE.template.md |
| `commands` | string（多行） | preset.commands 格式化 | CLAUDE.template.md |
| `module_map` | string | ScanResult.structure 格式化 | CLAUDE.template.md |
| `reference_files` | string | 固定模板 | CLAUDE.template.md |
| `language_and_style` | string（多行） | preset.codeStyle 格式化 | AGENTS.template.md |
| `naming_conventions` | string | 固定模板 | AGENTS.template.md, DESIGN.template.md |
| `file_organization` | string | 固定模板 | AGENTS.template.md, DESIGN.template.md |
| `architecture_constraints` | string | 固定模板 | AGENTS.template.md, DESIGN.template.md |
| `test_standards` | string | preset.techStack.testRunner 格式化 | AGENTS.template.md |
| `branch_strategy` | string | 固定模板 | AGENTS.template.md |
| `additional_roles` | string | 空字符串 | ROLES.template.md |
| `module_ownership_table` | string | 空字符串 | ROLES.template.md |

### 预设开发指南

创建新预设时只需关注 `preset.json`：

```json
{
  "name": "my-preset",
  "description": "预设描述（映射为 project_description）",
  "techStack": { ... },
  "variables": {
    "shared_dir": "src/shared",
    "feature_dir": "src/features",
    "api_dir": "src/api",
    "shared_package": "src/shared",
    "core_package": "src/core",
    "app_package": "src"
  },
  "codeStyle": [ ... ],
  "commands": { ... }
}
```

运行时变量由生成器自动从以上字段推导，无需手动指定。

## 后果

- **正面**：预设开发者有明确的契约参考
- **正面**：变量来源清晰（预设 vs 运行时），职责分明
- **注意**：`core_dir` 和 `app_dir` 当前无模板使用，属于预留字段

# CLAUDE.md — Claude Code 项目配置

> 由 G-Harness 生成。Claude Code 在此目录工作时自动加载。
> 通用 AI 规范见 `AGENTS.md`，本文件仅包含 Claude Code 特有的配置。

---

## 项目概述

{{project_description}}

## 技术栈

{{tech_stack}}

## 架构

{{architecture_overview}}

## 工作规则

### 上下文优先

每次执行任务前，按顺序读取：
1. 本文件（`CLAUDE.md`）
2. `AGENTS.md`（通用规范）
3. 目标目录的 `CLAUDE.md`（如存在）
4. 相关 ADR（`docs/decisions/`）
5. 当前活跃任务

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

- 注释语言：与代码库现有注释保持一致
{{code_style_rules}}

### 常用命令

```bash
{{commands}}
```

## 模块地图

```
{{module_map}}
```

## 引用文件

- 通用规范：`AGENTS.md`
{{reference_files}}

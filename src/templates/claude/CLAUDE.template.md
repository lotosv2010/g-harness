# CLAUDE.md — {{project_name}}

> Claude Code 项目级入口文件。Claude Code 在此目录工作时自动加载。
> 通用 AI 规范见 `AGENTS.md`。

---

## 项目一句话

{{project_description}}

## 技术栈

{{tech_stack}}

## 架构速览

{{architecture_overview}}

## 工作规则

每次执行任务前，按顺序读取：
1. 本文件（`CLAUDE.md`）
2. `AGENTS.md`（通用规范）
3. `.claude/rules/*.md`（硬性规则）
4. `docs/SPEC.md`、`docs/ARCHITECTURE.md`
5. `docs/tasks/CURRENT.md`（如存在）

## 执行协议

- 功能开发 → `.claude/protocols/feature.md`
- Bug 修复 → `.claude/protocols/bugfix.md`

## 核心规则（摘要）

{{code_standards}}

## 常用命令

{{commands}}

## 安全约束

- 禁止读取 `.env*` 内容、禁止硬编码密钥
- 破坏性操作需先确认；未经用户要求不自行 `git commit` / `git push`

## 引用

- `AGENTS.md`
- `.claude/rules/` 硬性规则
- `.claude/protocols/` 任务协议
- `docs/SPEC.md`、`docs/ARCHITECTURE.md`
- `docs/tasks/BOARD.md`、`docs/tasks/CURRENT.md`

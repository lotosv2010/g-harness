# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

## 待办（TODO）

### P1 — 重要

- [ ] **TASK-007**：实现 `gforge context sync/check`
- [ ] **TASK-008**：实现 `gforge migrate`
- [ ] **TASK-016**：guardrails 从文档变为代码 — 将 `.claude/guardrails/boundary-check.md` 的检查逻辑实现为可执行的 JS/TS 脚本，hook 调用
- [ ] **TASK-017**：实现 `gforge check` 轻量级实时校验 — 对比 `validate` 的全量扫描，`check` 只校验当前变更文件（配合 git diff）
- [ ] **TASK-018**：protocols 可检查化 — 协议改为 checklist 格式，配合 Stop 事件 hook 验证是否遗漏步骤
- [x] **TASK-019**：docs/ 模板分层为核心 + 可选 — 已随 TASK-013 一并完成
- [ ] **TASK-020**：实现 `--fix` 自动修复 — validate 基础规则的自动修复能力

### P2 — 一般

- [ ] **TASK-009**：创建 vue-nuxt 预设
- [ ] **TASK-010**：创建 node-api 预设
- [ ] **TASK-011**：创建 base 预设
- [ ] **TASK-012**：编写用户文档（getting-started）
- [ ] **TASK-021**：skills 通用化 — 将 SKILL.md frontmatter 格式抽象为通用格式，支持非 Claude Code 工具解析

---

## 进行中（IN PROGRESS）

（暂无）

---

## 已完成（DONE）

- [x] **TASK-019** — docs/ 模板分层（随 TASK-013 完成） — 2026-04-23
- [x] **TASK-015** — validate 接入 pre-commit hook — 2026-04-23
- [x] **TASK-014** — 可执行 hook（PostToolUse boundary-check + settings.json） — 2026-04-23
- [x] **TASK-013** — 分级输出（init 默认核心层，--full 完整输出） — 2026-04-23
- [x] **TASK-005** — src/ 结构重组：core/ + presets/ + templates/，templates 1:1 镜像目标项目 — 2026-04-23
- [x] **TASK-004** — 实现 FileGenerator，支持递归遍历 templates/ 和预设叠加 — 2026-04-23
- [x] **TASK-003** — 实现 ProjectScanner + 技术栈检测（含测试） — 2026-04-23
- [x] **TASK-002** — 实现 CLI 基础框架（init、validate、context stub、migrate stub） — 2026-04-23
- [x] **TASK-001** — P0 结构重构（单包结构，全部文档更新） — 2026-04-23
- [x] **TASK-000** — 项目初始架构设计与文档体系 — 2026-04-23

---

## 阻塞（BLOCKED）

（暂无）

---

## 规则

1. 任务 ID 格式：`TASK-XXX`，递增
2. 每个任务标注优先级（P0/P1/P2）和负责人
3. 任务移动时更新日期
4. 已完成任务保留 7 天后归档

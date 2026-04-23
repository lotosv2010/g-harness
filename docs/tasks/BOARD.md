# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

## 待办（TODO）

### P0 — 紧急

（暂无）

### P1 — 重要

- [ ] **TASK-006**：补充 generator、commands 单元测试，提升覆盖率至 80%
- [ ] **TASK-007**：实现 `gforge context sync/check`
- [ ] **TASK-008**：实现 `gforge migrate`

### P2 — 一般

- [ ] **TASK-009**：创建 vue-nuxt 预设
- [ ] **TASK-010**：创建 node-api 预设
- [ ] **TASK-011**：创建 base 预设
- [ ] **TASK-012**：编写用户文档（getting-started）

---

## 进行中（IN PROGRESS）

（暂无活跃任务）

---

## 已完成（DONE）

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

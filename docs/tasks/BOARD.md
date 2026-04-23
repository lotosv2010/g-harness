# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

## 待办（TODO）

### P0 — 紧急

- [ ] **TASK-002**：实现 CLI 基础框架（命令注册、参数解析、帮助文本）
- [ ] **TASK-003**：实现 ProjectScanner（技术栈检测、结构分析）
- [ ] **TASK-004**：实现 FileGenerator（模板读取、变量替换、文件输出）

### P1 — 重要

- [ ] **TASK-005**：实现 `gforge init` 命令端到端流程
- [ ] **TASK-006**：实现 RuleValidator 基础校验逻辑
- [ ] **TASK-007**：完善 react-vite 预设（补充 skills、完整变量映射）
- [ ] **TASK-008**：实现 `gforge validate` 命令

### P2 — 一般

- [ ] **TASK-009**：创建 vue-nuxt 预设
- [ ] **TASK-010**：创建 node-api 预设
- [ ] **TASK-011**：实现 ConfigMigrator
- [ ] **TASK-012**：编写用户文档（getting-started）

---

## 进行中（IN PROGRESS）

（暂无活跃任务）

---

## 已完成（DONE）

- [x] **TASK-000**：完成项目架构设计与目录结构搭建 — 2026-04-23
- [x] **TASK-001**：P0 结构重构（移除 packages、建立 core/src/presets/templates、文档更新）— 2026-04-23

---

## 阻塞（BLOCKED）

（暂无）

---

## 规则

1. 任务 ID 格式：`TASK-XXX`，递增
2. 每个任务标注优先级（P0/P1/P2）和负责人
3. 任务移动时更新日期
4. 已完成任务保留 7 天后归档

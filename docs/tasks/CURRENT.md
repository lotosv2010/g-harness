# 当前活跃任务

> 实时更新。AI 每次开始工作前先读取本文件。

---

## 当前阶段

**v0.1 → v0.2 — 从"规范框架"升级为"真正的 Harness"**

核心目标：让 Constraint 层从文档变为可执行闸门。

## 活跃任务

暂无活跃任务。下一批优先任务（按依赖顺序）：

### 第二批：增强校验能力（P1）

1. **TASK-016**：guardrails 代码化 — boundary-check 实现为可执行脚本
2. **TASK-017**：`gforge check` 轻量校验 — 只校验 git diff 变更文件
3. **TASK-018**：protocols 可检查化 — checklist + Stop 事件验证
4. **TASK-020**：validate --fix 自动修复

### 第三批：原有计划

5. **TASK-007**：实现 context sync/check
6. **TASK-008**：实现 migrate

## 最近完成

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-013 | 2026-04-23 | 分级输出：init 默认核心层，--full 完整输出（含 TASK-019 docs 分层） |
| TASK-014 | 2026-04-23 | 可执行 hook：PostToolUse boundary-check + settings.json 模板 |
| TASK-015 | 2026-04-23 | pre-commit hook：gforge validate 自动校验，阻断不合规提交 |
| TASK-005 | 2026-04-23 | src/ 结构重组：core/ + presets/ + templates/，templates 1:1 镜像目标项目 |
| TASK-004 | 2026-04-23 | 实现 FileGenerator，支持递归遍历 templates/ 和预设叠加 |
| TASK-003 | 2026-04-23 | 实现 ProjectScanner + 技术栈检测（含测试） |
| TASK-002 | 2026-04-23 | 实现 CLI 基础框架（init、validate、context stub、migrate stub） |
| TASK-001 | 2026-04-23 | P0 结构重构完成：单包结构，全部文档更新 |
| TASK-000 | 2026-04-23 | 项目初始架构设计与文档体系 |

## 下一步

第一批（P0）已完成，Constraint 层具备真实执行力。从 TASK-016 开始推进第二批。

# 当前活跃任务

> 实时更新。AI 每次开始工作前先读取本文件。

---

## 当前阶段

**v0.1 — CLI 基础 + 规范体系 + React 预设**

## 活跃任务

暂无活跃任务。下一批优先任务：

1. **TASK-006**：补充 generator、commands 单元测试，提升覆盖率至 80%
2. **TASK-007**：实现 `gforge context sync/check`
3. **TASK-008**：实现 `gforge migrate`

## 最近完成

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-005 | 2026-04-23 | src/ 结构重组：core/ + presets/ + templates/，templates 1:1 镜像目标项目 |
| TASK-004 | 2026-04-23 | 实现 FileGenerator，支持递归遍历 templates/ 和预设叠加 |
| TASK-003 | 2026-04-23 | 实现 ProjectScanner + 技术栈检测（含测试） |
| TASK-002 | 2026-04-23 | 实现 CLI 基础框架（init、validate、context stub、migrate stub） |
| TASK-001 | 2026-04-23 | P0 结构重构完成：单包结构，全部文档更新 |
| TASK-000 | 2026-04-23 | 项目初始架构设计与文档体系 |

## 下一步

补充测试覆盖（TASK-006），然后实现 context 和 migrate 命令（TASK-007/008）。

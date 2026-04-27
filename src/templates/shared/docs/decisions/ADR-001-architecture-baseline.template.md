---
id: ADR-001
status: accepted
date: {{project_name}} 初始化
---

# 架构基线

## 背景

{{project_name}} 采用以下技术栈启动：

{{tech_stack}}

为避免后续架构漂移，设立初始架构基线并在 PR 中作为审查参照。

## 决策

采用如下分层：

{{architecture_overview}}

模块划分：

{{module_breakdown}}

## 影响

### 正面
- 模块职责清晰，新成员能快速定位代码
- 跨模块依赖单向，便于测试与重构
- 目录结构与 SPEC 一一对应，减少认知负担

### 负面 / 权衡
- 早期代码量少时会显得"过度分层"
- 需在 CI 中加循环依赖检测，防止渐进腐化

## AI 指引

- 任何新增跨模块依赖必须先更新 `docs/ARCHITECTURE.md`
- 严禁绕过分层直接访问他模块内部
- 新建目录需更新 `docs/ARCHITECTURE.md#目录结构`

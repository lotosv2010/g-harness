---
id: ADR-001
status: superseded
date: 2026-04-23
superseded_by: ADR-001-v2
---

# [已废弃] Monorepo + pnpm Workspace 项目结构

> 本 ADR 已被废弃。G-Forge 已从 Monorepo 结构转为单包结构。
> 见下方 ADR-001-v2。

---

---
id: ADR-001-v2
status: accepted
date: 2026-04-23
superseded_by: null
---

# 单包结构 + CLI-first 设计

## 背景

G-Forge 最初设计为 Monorepo（packages/web, server, ai, shared），但经审查发现 G-Forge 是一个**规范框架 + CLI 工具**，不是一个含业务模块的应用。Monorepo 结构引入了不必要的复杂度。

## 决策

采用单包结构：`src/`（CLI 代码）+ `core/`（规范文件）+ `presets/`（技术栈预设）+ `templates/`（文件模板）。

## 备选方案

### 方案 A：单包结构（选定）
- 优点：简单、职责清晰、无 workspace 配置开销
- 缺点：如果未来需要拆包需要迁移

### 方案 B：Monorepo（原方案，已废弃）
- 优点：各包独立版本
- 缺点：框架不需要 web/server 包，过度设计

## 影响

### 正面影响
- 消除了"框架即应用"的身份混淆
- 简化了构建和发布流程
- 目录结构清晰反映框架的两个交付物：规范 + CLI

### 负面影响 / 权衡
- 如果未来需要独立发布子包，需要拆分

## AI 指引

- 代码放 `src/`，规范放 `core/`，技术栈特定内容放 `presets/`
- 禁止在 `core/` 中放代码逻辑
- 禁止在 `src/` 中放规范内容

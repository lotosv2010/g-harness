---
id: ADR-001
status: accepted
date: 2026-04-23
superseded_by: null
---

# Monorepo + pnpm Workspace 项目结构

## 背景

G-Forge 包含多个独立但相关的包（core、cli、presets、web、server），需要选择代码组织方式。

## 决策

采用 pnpm workspace + Turborepo 的 Monorepo 结构。

## 备选方案

### 方案 A：Monorepo（选定）
- 优点：共享类型安全、统一构建流程、开发体验好
- 缺点：仓库体积增长、CI 复杂度略高

### 方案 B：多仓库（Multi-repo）
- 优点：各包完全独立、CI 简单
- 缺点：类型同步困难、跨包修改需多次发版、开发体验差

## 影响

### 正面影响
- 所有包共享 TypeScript 类型定义，接口变更即时可见
- Turborepo 增量构建提升 CI 效率
- 本地开发无需 `npm link`，pnpm workspace 自动解析

### 负面影响 / 权衡
- 需要理解 pnpm workspace 和 Turborepo 配置
- 新包必须按既定目录结构组织

## AI 指引

- 新建包时放在 `packages/` 目录下
- 包间引用使用 workspace 协议（`"@gforge/shared": "workspace:*"`）
- 共享类型定义统一放在 `packages/shared/types/`
- 跨包导入必须通过包的公共 API（index.ts），禁止深度路径导入

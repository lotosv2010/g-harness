# 项目初始化记录

**日期**：2026-04-23

## 项目信息

- **名称**：G-Forge
- **定位**：AI 驱动的前端工程化规范框架（Harness Engineering 范式）
- **目标**：通过结构化的上下文、约定、约束和工作流，引导 AI 持续输出一致的、生产级的代码
- **适用场景**：新项目初始化 + 已有项目渐进式接入
- **主要 AI 工具**：Claude Code

## 技术决策

- Monorepo：pnpm workspace + Turborepo
- 语言：TypeScript strict
- 规则格式：YAML
- 模板引擎：Handlebars
- 分发方式：CLI-first（npm 包）

## 当前状态

- 架构设计完成
- 目录结构搭建完成
- 文档体系搭建完成
- 待实现：代码包（core、cli、presets）

---
id: ADR-001
status: accepted
date: 2026-04-23
---

# 单包结构，业务代码统一收纳于 src/

## 背景

G-Forge 是规范框架 + CLI 工具，不是含前后端业务模块的应用。早期的 Monorepo（packages/web, server, ai, shared）引入了不必要的复杂度。

## 决策

采用单包结构，根目录保持 AI 指导结构（docs、.claude、tools、tests），全部业务代码收纳于 `src/`：

```
src/
├── cli/         # CLI 命令入口
├── core/        # 核心逻辑（scanner, generator, validator, migrator）
├── utils/       # 通用工具函数
├── templates/   # 可分发的框架规范内容（Markdown，技术栈无关）
├── presets/     # 技术栈预设（preset.json + 栈特定规则）
└── templates/   # 文件模板（*.template.md）
```

## 理由

- 简单：无 workspace 配置，单次 `tsc` 构建
- 清晰：根目录是 AI 指导层，`src/` 是产品交付层
- 一致：G-Forge 自身目录结构与它 init 输出给目标项目的结构对齐

## AI 指引

- 代码逻辑只放 `src/cli`、`src/core`、`src/utils`
- 规范内容只放 `src/templates/`，禁止包含 TypeScript 代码
- 技术栈特定内容只放 `src/presets/`，每个预设自包含
- 模板文件只放 `src/templates/`，使用 `{{variable}}` 占位符

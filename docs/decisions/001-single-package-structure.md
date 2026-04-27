---
id: ADR-001
status: accepted
date: 2026-04-23
---

# 单包结构，业务代码统一收纳于 src/

## 背景

G-Harness 是规范框架 + CLI 工具，不是含前后端业务模块的应用。早期的 Monorepo（packages/web, server, ai, shared）引入了不必要的复杂度。

## 决策

采用单包结构，根目录保持 AI 指导结构（docs、.claude、tools、tests），全部业务代码收纳于 `src/`：

```
src/
├── core/        # CLI 引擎（commands、scanner、generator、validator、migrator）
├── presets/     # 技术栈预设（preset.json + 栈特定规则）
└── templates/   # 可分发的框架规范内容（1:1 镜像目标项目）
    ├── .ai/     # AI 通用规范 → 输出到目标项目 .claude/
    ├── docs/    # 文档模板 → 输出到目标项目 docs/
    ├── AGENTS.template.md
    └── CLAUDE.template.md
```

## 理由

- 简单：无 workspace 配置，单次 `tsc` 构建
- 清晰：根目录是 AI 指导层，`src/` 是产品交付层
- 一致：G-Harness 自身目录结构与它 init 输出给目标项目的结构对齐

## AI 指引

- 代码逻辑只放 `src/core/`
- 规范内容只放 `src/templates/`，禁止包含 TypeScript 代码
- 技术栈特定内容只放 `src/presets/`，每个预设自包含
- 模板文件使用 `{{variable}}` 占位符

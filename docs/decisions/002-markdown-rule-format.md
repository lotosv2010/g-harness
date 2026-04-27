---
id: ADR-002
status: accepted
date: 2026-04-23
---

# Markdown 作为规范文件格式

## 背景

G-Harness 需要一种格式来定义规则、协议、护栏和 Prompt 模板，供 AI 编程助手读取和遵循。

## 决策

使用 Markdown 作为所有规范文件格式，搭配 `{{variable}}` 变量语法实现参数化。

## 理由

- AI 原生友好：所有主流 AI 编程助手（Claude Code、Cursor、Copilot）天然理解 Markdown
- 零解析成本：不需要 YAML/JSON 解析器，直接作为上下文注入
- 人类可读：团队成员无需学习 DSL 即可编辑规范
- 版本控制友好：纯文本，diff 清晰

## 曾考虑的替代方案

- **YAML** — 结构化好，但 AI 读取 Markdown 更自然，且需要额外解析依赖
- **TypeScript DSL** — 类型安全，但非开发者无法编辑，且增加编译步骤
- **JSON** — 不支持注释，可读性差

## AI 指引

- `src/templates/` 中的规范文件统一使用 `.md` 扩展名
- 参数化使用 `{{variable_name}}`（双花括号 + 下划线命名）
- 未匹配的变量保留原样，不报错
- 规则文件使用标准结构：标题 → 引用说明 → 规则条目（ID + 内容）

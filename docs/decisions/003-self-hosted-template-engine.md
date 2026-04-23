---
id: ADR-003
status: accepted
date: 2026-04-23
---

# 自研变量替换替代模板引擎

## 背景

CLI `init` 命令需要将模板文件中的占位符替换为预设变量值后输出到目标项目。

## 决策

使用自研的 `resolveVariables()` 函数（正则 `{{variable}}`），不引入 Handlebars、EJS 等模板引擎。

## 理由

- 需求简单：当前只需要纯字符串替换，不需要条件、循环等逻辑
- 零依赖：避免引入重量级模板引擎
- 可控性：行为完全透明，未匹配变量保留原样而非报错
- 实现仅 9 行代码（`src/utils/variables.ts`）

## 风险

如果未来预设需要条件渲染（如"React 项目输出 JSX 规则，Vue 项目不输出"），当前方案不够用，届时再评估引入模板引擎。

## AI 指引

- 变量替换逻辑在 `src/utils/variables.ts`
- 变量名仅限 `\w+`（字母、数字、下划线）
- 预设变量定义在 `src/presets/<name>/preset.json` 的 `variables` 字段

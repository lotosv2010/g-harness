# 代码质量硬性规则 — {{project_name}}

> 不可违反。CI 与 pre-commit 会对部分规则做自动校验。

---

## 通用质量规则

{{code_standards}}

## R001：严格类型

- 启用语言级严格模式（TypeScript `strict: true` / Python mypy strict / Rust `#![deny(warnings)]`）
- 禁止使用宽松 any / Object / dynamic 逃避类型

## R002：错误处理

- 禁止空 catch 块
- 错误必须被处理或显式向上传播
- 关键路径错误带上下文（requestId / userId / 模块）

## R003：文件与函数粒度

- 单文件不超过 300 行（测试除外）
- 单函数不超过 40 行
- 函数参数超过 4 个时改为 options 对象

## R004：测试要求

{{test_standards}}

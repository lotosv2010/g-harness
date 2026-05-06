# 文件体积守卫（g-harness 项目自身）

> 防止单文件过大，促进模块拆分。
> 目标项目的守卫见 `src/templates/shared/.ai/guardrails/file-size.template.md`。

---

## 阈值

| 指标 | 警告 | 阻塞 |
|------|------|------|
| 文件行数 | >200 行 | >300 行 |
| 函数行数 | >30 行 | >40 行 |
| 函数参数 | >3 个 | >4 个（需用 options 对象） |

## 豁免

- `tests/` 下的测试文件不受行数限制
- `src/templates/` 下的模板文件不受限制
- `*.d.ts` 类型声明不受限制

## 检查时机

- AI 新建或修改文件时自动评估
- pre-commit hook 中检查变更文件

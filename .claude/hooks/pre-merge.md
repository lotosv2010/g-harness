# 合并前钩子（g-harness 项目自身）

> 触发时机：PR 合并到 main 前检查。

---

## 检查项

1. CI 全部通过（typecheck + test + lint）
2. 至少一人 Approved（或 AI review 通过）
3. 无合并冲突
4. PR 描述完整（摘要 + 变更清单 + 测试计划）

## g-harness 特殊检查

- 如修改了 `src/templates/`：确认模板技术栈无关性
- 如修改了 `src/core/template-categories.ts`：确认 `docs/SDLC-MAP.md` 已同步
- 如新增了 `.claude/rules/`：确认 `ARCHITECTURE.md` 1.2 节已更新

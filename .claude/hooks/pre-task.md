# 任务开始前钩子（g-harness 项目自身）

> 触发时机：AI 接受新任务时自动执行。

---

## 自动执行项

1. **读取上下文**
   - `docs/tasks/CURRENT.md` — 确认无冲突任务
   - `docs/tasks/BOARD.md` — 检查任务是否已存在
   - 相关模块的 `docs/ARCHITECTURE.md` 段落

2. **范围确认**
   - 列出将涉及的 `src/core/` 模块
   - 标注跨模块依赖风险（如 generator → analyzer → template-categories）
   - 如范围涉及 3+ 模块，建议拆分

3. **环境检查**
   - `git status` 干净
   - `pnpm-lock.yaml` 存在

## 输出

```
任务：[标题]
涉及模块：[列表]
前置检查：✓ 通过
```

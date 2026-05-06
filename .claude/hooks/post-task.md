# 任务完成后钩子（g-harness 项目自身）

> 触发时机：AI 完成一个任务后自动执行。

---

## 自动执行项

1. **更新看板**
   - 将任务从 IN PROGRESS 移到 DONE（`docs/tasks/BOARD.md`）
   - 附加完成日期

2. **验证通过**
   - `pnpm typecheck` — 类型检查
   - `pnpm test` — 测试
   - `pnpm lint` — 代码检查
   - 如有失败，标注为 BLOCKED

3. **生成摘要**
   - 输出变更文件列表
   - 输出验证结果
   - 提示下一步（下一个任务 / 提交 / PR）

## 输出

```
✓ 任务完成：[标题]
  变更：+N 文件, ~M 文件
  验证：typecheck ✓ | test ✓ | lint ✓
  下一步：[建议]
```

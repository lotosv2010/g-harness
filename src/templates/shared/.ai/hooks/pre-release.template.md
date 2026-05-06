# 发布前钩子 — {{project_name}}

> 触发时机：执行版本发布前自动检查。

---

## 检查项

1. **分支状态** — 在 main 分支且无未提交变更
2. **全量测试** — 完整测试套件通过
3. **构建验证** — 构建产物无错误
4. **版本号** — 符合语义化版本，无重复 tag
5. **Changelog** — CHANGELOG.md 已更新（或自动生成）

## 自动执行

- 从 commit 历史生成 Changelog 草稿
- 建议版本号（基于 Conventional Commits）
- 列出自上次发布以来的 breaking changes

## 输出

```
发布检查：
  分支：main ✓
  测试：通过 ✓
  构建：成功 ✓
  建议版本：vX.Y.Z (reason)
  Breaking changes：[有/无]
```

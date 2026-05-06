---
name: release
description: 发布前检查清单 + Changelog 生成 + 语义化版本号建议。
triggers:
  - 发版
  - 发布
  - release
  - changelog
invocable: true
arguments: []
capabilities:
  - read
  - search
  - execute
---

# 发版流程（release）

执行发布前检查，生成 Changelog，建议版本号。

## 用法

```
/release
```

## 执行步骤

1. **发布前检查**
   - 类型检查通过
   - 全量测试通过
   - Lint 无 error
   - 无未提交变更
   - 当前在 main 分支

2. **版本号建议**（基于 Conventional Commits）
   - 有 `feat:` → minor
   - 有 `fix:` → patch
   - 有 `BREAKING CHANGE` 或 `!:` → major

3. **Changelog 生成**
   - 从上一个 tag 到 HEAD 的所有 commit
   - 按 type 分组：Features / Bug Fixes / Refactoring / Others

4. **输出**
   - 建议版本号
   - Changelog 内容
   - 发布命令（待用户确认执行）

## 约束

- 不自动执行版本更新或发布
- Changelog 基于 commit 历史，不猜测
- 发布命令等用户确认后才执行

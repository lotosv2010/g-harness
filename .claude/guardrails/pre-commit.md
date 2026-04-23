# 提交前检查守卫

> 定义 Git 提交前必须通过的检查清单。
> 对应 pre-commit hook 和 Claude Code 的 PreCommit 事件。

---

## 检查清单

### 必须通过（阻塞提交）

1. **TypeScript 编译** — `pnpm typecheck` 通过
2. **ESLint** — `pnpm lint` 无 error
3. **单元测试** — `pnpm test` 全部通过
4. **敏感信息扫描** — 无硬编码密钥、Token

### 建议通过（警告但不阻塞）

5. **文件长度** — 无超过 300 行的新文件
6. **TODO 检查** — 新增的 TODO 已关联任务 ID
7. **文档同步** — 变更涉及的 CLAUDE.md 已更新

## 提交消息格式

必须符合 Conventional Commits：

```
<type>(<scope>): <description>

[body]

[footer]
```

有效的 type：
- `feat` — 新功能
- `fix` — Bug 修复
- `refactor` — 重构
- `docs` — 文档
- `test` — 测试
- `chore` — 杂项

## 检查脚本参考

```bash
#!/bin/bash
set -e

echo "Running pre-commit checks..."

echo "1/4 TypeScript check..."
pnpm typecheck

echo "2/4 ESLint..."
pnpm lint

echo "3/4 Tests..."
pnpm test --run

echo "4/4 Secret scan..."
# 扫描暂存文件中的敏感信息模式
git diff --cached --name-only | xargs grep -l -E \
  '(api[_-]?key|secret|password|token)\s*[:=]\s*["\x27][^\s]+' || true

echo "All checks passed!"
```

# 提交前检查守卫

> 定义 Git 提交前必须通过的检查清单。

---

## 检查清单

### 必须通过（阻塞提交）

1. **类型检查** — 通过（如适用）
2. **代码检查** — 无 error
3. **单元测试** — 全部通过
4. **敏感信息扫描** — 无硬编码密钥、Token

### 建议通过（警告但不阻塞）

5. **文件长度** — 无超过 300 行的新文件
6. **TODO 检查** — 新增的 TODO 已关联任务 ID
7. **文档同步** — 变更涉及的上下文文件已更新

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

echo "1/4 Type check..."
# 根据项目技术栈选择：pnpm typecheck / tsc --noEmit / mypy 等

echo "2/4 Lint..."
# 根据项目技术栈选择：pnpm lint / eslint / ruff 等

echo "3/4 Tests..."
# 根据项目技术栈选择：pnpm test --run / pytest / go test 等

echo "4/4 Secret scan..."
git diff --cached --name-only | xargs grep -l -E \
  '(api[_-]?key|secret|password|token)\s*[:=]\s*["\x27][^\s]+' || true

echo "All checks passed!"
```

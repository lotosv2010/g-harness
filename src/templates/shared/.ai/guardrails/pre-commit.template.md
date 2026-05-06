# 提交前检查守卫 — {{project_name}}

> Git 提交前必须通过的检查清单。

---

## 必须通过（阻塞提交）

1. **类型检查** — 编译通过，无类型错误
2. **Lint** — 无 error 级别问题
3. **单元测试** — 相关测试用例全部通过
4. **敏感信息扫描** — 无硬编码密钥、Token、密码

## 建议通过（警告但不阻塞）

5. **文件长度** — 无超过 300 行的新文件
6. **TODO 检查** — 新增的 TODO 已关联任务 ID
7. **文档同步** — 变更涉及的规范文档已更新

## 提交消息格式

必须符合 Conventional Commits：

```
<type>(<scope>): <description>
```

有效 type：feat / fix / refactor / docs / test / chore / perf / ci

## 检查命令参考

```bash
{{commands}}
```

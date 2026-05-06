# 回滚操作手册

> 当 npm 发布后发现严重问题需要回退版本时的具体操作步骤。

---

## 1. 判断回滚类型

| 情况 | 操作 |
|------|------|
| 小问题，可快速修复 | 走 hotfix 流程，发布 patch 版本 |
| 严重问题，72h 内发现 | `npm unpublish` + 修复后重发 |
| 严重问题，超过 72h | `npm deprecate` + 发布新 patch 指向用户升级 |

## 2. 操作步骤

### 2.1 废弃问题版本

```bash
# 标记为废弃（用户安装时会收到警告）
npm deprecate g-harness@<问题版本> "存在已知问题，请升级到 <稳定版本>"
```

### 2.2 撤回发布（72 小时内）

```bash
# 完全移除版本（不可逆，慎用）
npm unpublish g-harness@<问题版本>
```

### 2.3 Git 回退

```bash
# 1. 定位稳定版本
git log --oneline --tags

# 2. revert 问题 commit（保留历史）
git revert <问题commit SHA>
git push origin main

# 3. 发布修复版本
npm version patch
pnpm build
npm publish
git push --follow-tags
```

## 3. 验证清单

- [ ] `npx g-harness@latest --version` 输出正确版本
- [ ] `npx g-harness init --help` 正常运行
- [ ] npmjs.com 显示正确的 latest tag
- [ ] 问题版本已标记 deprecated 或已撤回

## 4. 善后

- 通知用户执行 `npx g-harness@latest` 升级
- 记录事故时间线
- 评估需要新增的自动化检查

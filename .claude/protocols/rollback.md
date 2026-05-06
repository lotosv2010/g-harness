# 回滚协议（g-harness 项目自身）

> npm 发布后发现严重问题需要回退版本时的操作流程。

---

## 触发条件

- hotfix 无法在 30 分钟内完成
- 发布版本破坏用户已有项目配置
- 安全漏洞需立即下架当前版本

## 1. 决策

- 评估：能否 hotfix 快速修复？
  - 是 → 走 `hotfix` 协议
  - 否 → 继续回滚
- 确认回滚目标：上一个稳定的 npm 版本号

## 2. 执行

### npm 版本回退

```bash
# 废弃问题版本（用户安装时会收到警告）
npm deprecate g-harness@<问题版本> "已知问题，请使用 <稳定版本>"

# 如果问题极端严重，可 unpublish（72 小时内）
npm unpublish g-harness@<问题版本>
```

### Git 操作

```bash
# revert 问题 commit（保留历史）
git revert <问题commit>..HEAD --no-commit
git commit -m "revert: rollback to v<稳定版本>"
git push origin main
```

## 3. 验证

- 确认 `npx g-harness@<稳定版本> init` 正常工作
- 检查 npmjs.com 页面显示正确的 latest 版本
- 通知用户锁定到稳定版本

## 4. 善后

- 记录事故时间线到 `docs/runbooks/`
- 分析根因，加强发布前检查
- 评估是否需要增加集成测试场景

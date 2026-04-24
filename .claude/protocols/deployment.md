# 部署协议（g-forge 自身）

> 当用户请求"发布"、"发 npm"、"打 tag"、"灰度"、"回滚"时，遵循本协议。
> 注：g-forge 本身是 CLI 工具，部署 = npm 发布 + GitHub Release。

---

## 阶段 1：准备度评估

**必做：**
1. 确认本次发布内容（变更清单）
2. 检查 CI 状态：`pnpm typecheck` / `pnpm test` / `pnpm lint` 全部 green
3. 检查 `CHANGELOG.md` 是否已更新
4. 检查 `package.json` 版本号是否符合 SemVer 规则

**禁止：** CI 未通过就发布

## 阶段 2：风险与回滚计划

**必做：**
1. 评估变更风险（是否有 breaking change？）
2. 如有 breaking change，major 号升级 + 在 CHANGELOG 显著标注
3. 回滚策略：npm 的 deprecate 旧版本 + 用户降级指引

## 阶段 3：执行发布

**必做：**
1. 确认 git 工作区干净
2. 在 main 分支打 tag：`git tag v<version>`
3. 运行 `pnpm build` 生成 `dist/`
4. 运行 `npm publish`（需要 2FA）
5. 推送 tag：`git push --follow-tags`
6. 创建 GitHub Release，附上 CHANGELOG

**原则：** 发布过程中不做其他变更

## 阶段 4：验证

**必做：**
1. 通过 `npx gforge@latest --version` 验证发布成功
2. 在空目录运行 `gforge init` 确认核心流程可用
3. 检查 npm 页面元数据（README、keywords）是否正确

## 阶段 5：收尾

**必做：**
1. 更新 `docs/SPEC.md` 版本路线图为"已完成"
2. 关闭本次发布关联的 Issue / Task
3. 在 README 顶部/徽章同步新版本号（如需要）

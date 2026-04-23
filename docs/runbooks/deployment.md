# 部署操作手册

> 记录 G-Forge 各组件的部署流程和应急操作。

---

## 1. CLI 包发布（npm）

### 前置条件
- 已登录 npm（`npm whoami`）
- 所有测试通过（`pnpm test`）
- 版本号已更新

### 发布步骤

```bash
# 1. 确认当前在 main 分支且干净
git status

# 2. 运行完整测试
pnpm test
pnpm typecheck
pnpm lint

# 3. 构建所有包
pnpm build

# 4. 更新版本（使用 changeset 或手动）
pnpm changeset version

# 5. 发布
pnpm changeset publish

# 6. 推送 tag
git push --follow-tags
```

### 回滚

```bash
# 如果发布了有问题的版本
npm unpublish @gforge/cli@<version>  # 72 小时内有效
# 或发布修复版本
npm publish --tag latest
```

---

## 2. 文档站部署（Vercel）

### 自动部署
- 推送到 `main` 分支自动触发 Vercel 部署
- PR 会自动生成预览部署

### 手动部署

```bash
cd packages/web
pnpm build
vercel --prod
```

---

## 3. 常见问题排查

### pnpm workspace 解析失败

```bash
# 清理并重新安装
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Turborepo 缓存问题

```bash
# 清理 Turbo 缓存
pnpm turbo clean
# 或指定不使用缓存构建
pnpm build --force
```

### 类型检查失败但代码正确

```bash
# 重新生成 TypeScript 引用
pnpm typecheck --build --clean
```

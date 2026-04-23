# 部署操作手册

> 记录 G-Forge CLI 的发布流程和应急操作。

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

# 2. 运行完整检查
pnpm test
pnpm typecheck
pnpm lint

# 3. 构建
pnpm build

# 4. 更新版本
npm version <patch|minor|major>

# 5. 发布
npm publish

# 6. 推送 tag
git push --follow-tags
```

### 回滚

```bash
# 如果发布了有问题的版本
npm unpublish gforge@<version>  # 72 小时内有效
# 或发布修复版本
npm publish --tag latest
```

---

## 2. 文档站部署（未来，可选）

推送到 `main` 分支自动触发静态站部署（Vercel / Cloudflare Pages）。

---

## 3. 常见问题排查

### 依赖安装失败

```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### 类型检查失败但代码正确

```bash
# 清理 TypeScript 缓存
rm -rf dist
pnpm typecheck
```

### 构建产物不正确

```bash
rm -rf dist
pnpm build
```

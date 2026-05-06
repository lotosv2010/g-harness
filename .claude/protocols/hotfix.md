# 紧急修复协议（g-harness 项目自身）

> 生产环境紧急问题的快速修复通道。发现 npm 发布的包有 breaking bug 时触发。

---

## 触发条件

- `npx g-harness init` 在用户环境崩溃
- 发布的版本包含安全漏洞
- 核心模板输出错误导致目标项目规范损坏

## 1. 评估（≤5 分钟）

- 确认影响范围（哪些命令受影响、哪些版本）
- 判断严重度：是否需要 hotfix 还是可等下个版本
- 检查 `git log --oneline -10` 定位引入问题的 commit

## 2. 分支与修复

- 从最近的 release tag 创建 `hotfix/<描述>` 分支
- 最小修改原则，只修当前问题
- 必须包含回归测试覆盖该场景

## 3. 快速验证

```bash
pnpm typecheck
pnpm test
pnpm build
# 用构建产物本地测试
node dist/index.js init --help
```

## 4. 发布

- 遵循 `docs/runbooks/deployment.md` 流程
- 版本号 patch 递增
- npm publish 后确认 `npx g-harness --version` 输出正确

## 5. 善后

- 将 hotfix 合并回 main
- 在 `docs/tasks/CURRENT.md` 记录事故摘要
- 评估是否需要额外测试门禁防止复发

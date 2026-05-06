# 事故响应操作手册

> 当用户报告 g-harness CLI 生产问题时的响应流程。

---

## 1. 严重度分级

| 级别 | 定义 | 响应时间 | 示例 |
|------|------|----------|------|
| P0 | CLI 完全不可用 | <1h | `npx g-harness init` 崩溃 |
| P1 | 核心功能异常 | <4h | 模板生成输出损坏、覆盖用户文件 |
| P2 | 非核心功能异常 | <24h | 特定预设失败、文档链接失效 |
| P3 | 体验问题 | 下个版本 | UI 显示异常、性能慢 |

## 2. 响应流程

### 阶段 1：止血（P0/P1 ≤30 分钟）

```bash
# 1. 复现问题
npx g-harness@<问题版本> init /tmp/test-project

# 2. 检查最近变更
git log --oneline -10

# 3. 定位引入问题的 commit
git bisect start
git bisect bad HEAD
git bisect good <上一个稳定 tag>
```

### 阶段 2：修复

- 如果可快速修复 → 走 hotfix 流程
- 如果无法快速修复 → 走回滚流程（见 `rollback.md`）

### 阶段 3：验证

```bash
# 修复后验证
pnpm typecheck && pnpm test && pnpm lint
pnpm build
node dist/index.js init --help
```

### 阶段 4：复盘

创建事故报告：

```markdown
# 事故报告：[标题]

**时间**：YYYY-MM-DD
**严重度**：P0/P1/P2
**影响**：[用户数/功能范围]
**根因**：[技术原因]
**修复**：[commit SHA / PR link]
**预防**：[新增的测试/检查]
```

## 3. 联系方式

- 项目维护者：见 `docs/team/ROLES.md`
- Issue 追踪：GitHub Issues
- 紧急沟通：按团队约定的即时通信渠道

## 4. 常用排查命令

```bash
# 检查 npm 发布状态
npm info g-harness versions --json

# 查看特定版本内容
npm pack g-harness@<version> --dry-run

# 对比两个版本的差异
diff <(npm pack g-harness@<v1> --dry-run 2>&1) <(npm pack g-harness@<v2> --dry-run 2>&1)
```

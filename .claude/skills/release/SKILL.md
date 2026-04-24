---
name: release
description: 发布前检查清单 + Changelog 生成 + 语义化版本号建议。确保每次发布质量可控。
triggers:
  - 发布
  - 准备发版
  - 发版检查
  - changelog
  - 版本号
invocable: true
arguments:
  - name: version
    hint: "[major|minor|patch|X.Y.Z]"
    required: false
capabilities:
  - read
  - write
  - search
  - execute
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep Bash"
---

# 发布检查（release）

发布前的系统性质检 + Changelog 生成 + 版本号建议。

## 用法

```
/release               # 完整发布检查 + 版本建议
/release patch         # 指定 patch 发版
/release 1.2.0         # 指定目标版本号
```

## 执行步骤

### 1. 版本号决策

读取最近一次 release 以来的所有 commit（`git log`），分析变更类型：

| 变更类型 | 版本影响 | 判断标准 |
|----------|----------|----------|
| `feat:` + 破坏性变更 | major | commit body 含 `BREAKING CHANGE` |
| `feat:` | minor | 新功能 |
| `fix:` / `perf:` / `refactor:` | patch | 修复和改进 |

输出版本建议，等用户确认。

### 2. 发布检查清单

逐项检查并输出通过/失败状态：

**代码质量：**
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过（含覆盖率）
- [ ] `pnpm lint` 通过
- [ ] `gforge validate` 零违规

**文档同步：**
- [ ] `docs/SPEC.md` 验收标准与实际一致
- [ ] `docs/ARCHITECTURE.md` 模块列表与 `src/` 一致
- [ ] `README.md` 命令示例可运行
- [ ] `GETTING_STARTED.md` 流程与实际一致

**依赖安全：**
- [ ] 无已知高危漏洞（检查 `npm audit` 或 `pnpm audit`）
- [ ] 无未使用的依赖

**Git 状态：**
- [ ] 工作区干净（无未提交变更）
- [ ] 当前分支与 main 无冲突

### 3. Changelog 生成

从 git log 中提取 conventional commits，按类别分组：

```markdown
## [X.Y.Z] — YYYY-MM-DD

### 新功能
- feat: xxx (#PR)

### 修复
- fix: xxx (#PR)

### 改进
- refactor: xxx
- perf: xxx

### 文档
- docs: xxx
```

写入 `CHANGELOG.md`（追加到文件顶部，保留历史记录）。

### 4. 发布摘要

```markdown
## 发布就绪报告

**版本**：X.Y.Z
**检查项**：N/N 通过
**变更**：M 个 commit（N feat / N fix / N other）

### 未通过项（如有）
- [项目] — 原因

### 下一步
- 确认后执行 `npm version X.Y.Z && npm publish`
```

## 约束

- 不自动执行 `npm publish`，仅建议命令
- 不自动执行 `git tag`，仅建议版本号
- Changelog 格式遵循 Keep a Changelog 规范

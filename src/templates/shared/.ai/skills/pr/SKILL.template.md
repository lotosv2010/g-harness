---
name: pr
description: 从 git diff 自动生成结构化 PR 描述（摘要/变更清单/测试计划/自审清单），支持直接创建 GitHub PR。
triggers:
  - 创建 PR
  - 提交 PR
  - PR 描述
  - pull request
invocable: true
arguments: []
capabilities:
  - read
  - search
  - execute
---

# PR 描述生成（pr）

从当前分支的 git diff 自动生成结构化的 PR 描述。

## 用法

```
/pr
```

## 执行步骤

1. 运行 `git diff main...HEAD` 获取变更
2. 运行 `git log main..HEAD --oneline` 获取 commit 列表
3. 分析变更内容，归类为：新功能 / 修复 / 重构 / 文档 / 其他
4. 生成 PR 描述

## 输出格式

```markdown
## 摘要

[1~3 句话说明本 PR 的目的和方案]

## 变更清单

- [模块 A] — [做了什么]
- [模块 B] — [做了什么]

## 测试计划

- [ ] [测试项 1]
- [ ] [测试项 2]

## 自审清单

- [ ] 类型检查通过
- [ ] 测试通过
- [ ] 无硬编码密钥
- [ ] 文档已同步
```

## 约束

- 描述基于实际 diff，不猜测
- commit message 用于理解意图，不直接复制
- 不自动执行 push 或创建 PR（除非用户确认）

---
name: pr
description: 从 git diff 自动生成结构化 PR 描述（摘要/变更清单/测试计划/自审清单），支持直接创建 GitHub PR。
triggers:
  - 生成 PR
  - 写 PR
  - 提交 PR
  - PR 描述
  - pull request
invocable: true
arguments:
  - name: base
    hint: "[base-branch]"
    required: false
capabilities:
  - read
  - search
  - execute
extensions:
  claude:
    allowed-tools: "Read Glob Grep Bash(git *) Bash(gh *)"
---

# PR 描述生成（pr）

从 git diff 自动生成结构化 PR 描述，可选直接创建 GitHub PR。

## 用法

```
/pr                    # 基于当前分支 vs main 生成 PR 描述
/pr develop            # 基于当前分支 vs develop 生成
```

## 执行步骤

### 1. 变更分析

```bash
git log main..HEAD --oneline       # 提交历史
git diff main...HEAD --stat        # 文件变更统计
git diff main...HEAD               # 完整 diff
```

分析维度：
- 变更类型分类（新功能 / 修复 / 重构 / 文档 / 测试）
- 涉及模块和文件
- 破坏性变更检测
- 依赖变更检测

### 2. 生成 PR 描述

```markdown
## Summary

[1~3 句话描述本次变更的目的和核心内容]

## Changes

### [分类 1]
- [变更描述]（`file-path`）

### [分类 2]
- [变更描述]

## Breaking Changes

[无 / 列出破坏性变更及迁移方式]

## Test Plan

- [ ] [测试项 1]
- [ ] [测试项 2]

## Self-Review Checklist

- [ ] 代码遵循项目规范
- [ ] 无硬编码密钥或敏感信息
- [ ] 新功能有对应测试
- [ ] 文档已同步更新
- [ ] 无不必要的 console.log / debugger
- [ ] 类型检查通过
- [ ] Lint 通过
```

### 3. 用户确认

输出生成的 PR 描述，询问：
- 直接创建 GitHub PR？（需要 `gh` CLI）
- 修改后再创建？
- 仅复制描述（不创建 PR）？

如果用户选择创建：
```bash
gh pr create --title "PR 标题" --body "PR 描述"
```

## 自审清单说明

自审清单根据 diff 内容动态调整：

| 检测到的变更 | 追加检查项 |
|-------------|-----------|
| 新依赖 | 依赖是否必要？是否有更轻量替代？ |
| API 变更 | API 向后兼容？文档更新？ |
| 数据模型变更 | 迁移脚本？回滚方案？ |
| 配置文件变更 | 环境变量文档更新？ |
| 安全相关文件 | 权限变更是否必要？ |

## 约束

- 不自动推送代码，创建 PR 前必须用户确认
- PR 标题不超过 70 字符
- 如果工作区有未提交变更，先提示用户处理

---
name: feat
description: 端到端需求交付流程：需求分析 → ADR 设计 → 任务拆解 → 用户 Review → 逐任务实现。
triggers:
  - 新需求
  - 新功能
  - 实现需求
  - 需求交付
invocable: true
arguments:
  - name: requirement
    hint: "<需求描述>"
    required: true
capabilities:
  - read
  - write
  - search
  - execute
---

# 端到端需求交付（feat）

将一句话需求驱动成完整的设计 → 拆解 → 实现流程。

## 用法

```
/feat 实现用户登录功能，支持邮箱和手机号
/feat 新增数据导出模块，支持 CSV 和 Excel 格式
```

## 流程概览

```
Phase 1: 需求理解 → Phase 2: 方案设计（ADR）→ Phase 3: 任务拆解 → Phase 4: 逐任务实现 → Phase 5: 交付确认
```

## Phase 1: 需求理解

1. 读取上下文：`docs/SPEC.md`、`docs/ARCHITECTURE.md`、`docs/tasks/CURRENT.md`
2. 分析涉及模块和边界
3. 输出理解确认，有疑问必须等用户回答

## Phase 2: 方案设计（ADR）

1. 设计 1~3 个备选方案（技术路径、优缺点、影响）
2. 推荐方案并写入 `docs/decisions/ADR-XXX-*.md`
3. 等待用户 Review 确认

## Phase 3: 任务拆解

1. 将方案拆成可独立交付的任务（每个 1~2 小时）
2. 写入 `docs/tasks/BOARD.md` + `docs/tasks/CURRENT.md`
3. 等待用户 Review 确认

## Phase 4: 逐任务实现

按依赖顺序执行，每个任务遵循 feature protocol：
1. 编码 + 同步测试
2. 验证通过（类型检查 + 测试 + Lint）
3. 更新看板状态

## Phase 5: 交付确认

输出变更清单、验证状态、提交建议。

## 约束

- 每个阶段切换前必须有用户确认
- 遵循所有硬性规则
- 不自动执行 git commit / push

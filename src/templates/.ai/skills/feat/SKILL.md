---
name: feat
description: 端到端需求交付流程：需求分析 → ADR 设计 → 任务拆解 → 用户 Review → 逐任务实现。输入需求描述即自动驱动全流程。
triggers:
  - 新需求
  - 新功能
  - 实现需求
  - 需求交付
  - 做一个功能
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
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep Bash Agent"
---

# 端到端需求交付（feat）

将一句话需求驱动成完整的设计 → 拆解 → 实现流程。

## 用法

```
/feat 新增用户登录功能，支持邮箱和手机号
/feat 重构订单模块，拆分为查询和写入服务
/feat 添加数据导出 API，支持 CSV 和 Excel
```

## 流程概览

```
Phase 1: 需求理解 ──→ Phase 2: 方案设计（ADR）──→ Phase 3: 任务拆解
     │                       │                           │
     ▼                       ▼                           ▼
  上下文收集            写入 docs/decisions/         写入 BOARD.md + CURRENT.md
  需求复述确认          等待用户 Review               等待用户 Review
                        ↻ 修改直到确认                ↻ 修改直到确认
                                                          │
                                                          ▼
                                              Phase 4: 逐任务实现
                                                   遵循 feature protocol
                                                   每个任务完成后更新看板
```

## Phase 1: 需求理解

**目标**：确保对需求的理解无偏差。

**步骤：**
1. 读取上下文文件（按优先级）：
   - 项目入口配置文件（如 `CLAUDE.md`）
   - `docs/SPEC.md` — 产品规格（确认需求在范围内）
   - `docs/ARCHITECTURE.md` — 架构约束
   - `docs/tasks/CURRENT.md` — 当前进行中的工作（避免冲突）
   - `docs/tasks/BOARD.md` — 已有任务（避免重复）
   - `docs/decisions/` — 相关 ADR（已有决策不重复）
2. 分析需求涉及的模块和边界
3. 输出需求理解确认：

```markdown
## 需求理解

**需求概述**：[一句话总结]

**涉及模块**：
- [模块 1] — [影响说明]
- [模块 2] — [影响说明]

**关键约束**：
- [约束 1]
- [约束 2]

**疑问（如有）**：
- [问题 1]

理解正确吗？确认后进入方案设计阶段。
```

**卡点规则**：如有疑问必须等用户回答后再继续。无疑问则直接进入 Phase 2。

## Phase 2: 方案设计（ADR）

**目标**：产出架构决策记录，作为实现的契约。

**步骤：**
1. 确定 ADR 编号：读取 `docs/decisions/` 取最大编号 + 1
2. 设计 1~3 个备选方案，每个方案包含：
   - 技术选型和实现路径
   - 优点 / 缺点 / 权衡
   - 对现有架构的影响
3. 推荐一个方案并说明理由
4. 按 `docs/decisions/template.md` 格式写入 ADR 文件
5. 输出 ADR 摘要并请求 Review：

```markdown
## ADR-XXX 已写入

**决策**：[一句话]
**推荐方案**：[方案名]
**文件**：docs/decisions/ADR-XXX-xxx.md

请 Review ADR，确认或提出修改意见。确认后进入任务拆解。
```

**卡点规则**：必须等用户确认 ADR 后才进入 Phase 3。用户要求修改时更新 ADR 并重新请求确认。

## Phase 3: 任务拆解

**目标**：将 ADR 中的方案拆成可独立交付、有明确验收标准的任务。

**拆解原则：**
- 每个任务 1~2 小时可完成（对 AI 而言约 1 轮对话）
- 任务之间有清晰的依赖顺序
- 每个任务有明确的输入/输出/验收标准
- 底层模块先于上层模块（先核心再胶水再 UI）
- 测试随功能同步，不单独拆为"补测试"任务

**步骤：**
1. 读取 `docs/tasks/BOARD.md` 取当前最大 TASK 编号
2. 拆解任务列表，每个任务格式：

```markdown
- [ ] **TASK-XXX** — [标题]（[预估复杂度 S/M/L]）
  - 输入：[依赖什么]
  - 输出：[产出什么文件/模块]
  - 验收：[验收标准]
  - 依赖：[前置任务 ID，无则"无"]
```

3. 将任务写入 `docs/tasks/BOARD.md`（TODO 区）
4. 更新 `docs/tasks/CURRENT.md`（活跃任务索引）
5. 输出任务清单并请求 Review：

```markdown
## 任务拆解完成

共 N 个任务（TASK-XXX ~ TASK-YYY），已写入看板。

[任务列表摘要]

请 Review 任务拆解，确认或调整后开始实现。
```

**卡点规则**：必须等用户确认任务拆解后才进入 Phase 4。

## Phase 4: 逐任务实现

**目标**：按依赖顺序逐个交付任务。

**每个任务的执行流程（遵循 feature protocol）：**
1. 将任务从 TODO 移到 IN PROGRESS（更新 BOARD.md）
2. 按项目的 feature protocol 执行：
   - 确认要创建/修改的文件
   - 编码 + 同步编写测试
   - 遵循项目规则文件中的所有规则
3. 验证：
   - 类型检查（{{commands}}）
   - 运行测试
   - 代码检查
4. 将任务从 IN PROGRESS 移到 DONE（更新 BOARD.md，附完成日期）
5. 简要报告任务完成情况，然后继续下一个任务

**流转规则：**
- 任务按依赖顺序执行，无依赖的任务可以合并执行
- 每个任务完成后立即更新看板状态
- 如遇阻塞（技术障碍、需求歧义），暂停并询问用户
- 全部任务完成后，输出整体交付摘要

## Phase 5: 交付确认

全部任务完成后输出：

```markdown
## 交付摘要

**需求**：[原始需求]
**ADR**：docs/decisions/ADR-XXX-xxx.md
**任务**：TASK-XXX ~ TASK-YYY（共 N 个，全部完成）

**变更清单**：
- 新增：[文件列表]
- 修改：[文件列表]

**验证状态**：
- typecheck: PASS
- test: PASS
- lint: PASS

如需提交代码，请告诉我。
```

## 约束

- 遵循项目规则文件中的所有硬性规则
- 遵循项目 feature protocol
- ADR 必须使用 `docs/decisions/template.md` 格式
- 任务 ID 必须递增，不与 BOARD.md 中已有 ID 冲突
- 不自动执行 git commit / push（除非用户明确要求）
- 每个阶段切换前必须有用户确认（Phase 1 无疑问时可跳过）

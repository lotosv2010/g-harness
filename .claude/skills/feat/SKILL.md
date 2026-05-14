---
name: feat
description: |
  Load when 用户请求端到端交付一个功能，或提到「需求分析 / 任务拆解 / PRD / ARD / 写测试 / Code Review」中任意阶段。
  本 Skill 串起 6 个阶段并保持跨阶段可追溯：需求 → 任务 → PRD/ARD → 编码 → 测试 → CR。
  即使只触发其中一个阶段（"只帮我写 PRD"），也加载本 Skill 以复用前序上下文。
triggers:
  - 帮我做这个需求
  - 帮我实现 / 帮我开发 / 帮我编码
  - 拆分任务 / 拆 story
  - 写 PRD / 写 ARD / 写需求文档
  - 写测试用例 / 单元测试 / 集成测试
  - 做 code review / CR / 审查这段代码
  - 验收标准 / 用户故事 / 接口设计
invocable: true
arguments:
  - name: requirement
    hint: "<需求描述 或 阶段指令>"
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

# feat — 端到端需求交付

将一句话需求驱动为「需求 → 设计 → 拆解 → 编码 → 测试 → CR」全流程，每阶段可独立触发。

## 适用边界（Hero Queries / Out of Scope）

**应触发：**
- "帮我做 / 实现 / 开发 …" — 完整功能交付
- "分析这个需求 / 拆任务 / 写 PRD / 写 ARD" — 单阶段切入
- "review / 审查 / 评分这段代码" — 仅触发阶段 6
- "为 X 模块补测试用例" — 仅触发阶段 5

**不应触发（交给其他 Skill）：**
- 改 1~2 行的小修复 → 直接编辑，不走流程
- 纯重构 / 性能优化 → `protocols/refactor.md`
- 线上事故响应 → `protocols/incident.md`
- 仅生成 commit message → `zcf:git-commit`
- 发版 / changelog → `release` skill

## 流程总览

```
[1] 需求分析 → [2] 任务拆解 → [3] PRD/ARD → [4] 编码 → [5] 测试 → [6] Code Review
     ▼              ▼               ▼            ▼          ▼            ▼
  REQ-XXX        TASK-XXX        docs/        feature      TC-XXX     CR-XXX
                BOARD.md       (ADR/PRD/      protocol               评分 + 行动项
                               ARD)
```

**核心原则**
- 先定边界，再产内容；模糊点优先追问（最多 3 条），不假设。
- 每个产出物带 ID，可追溯回上游需求（见末尾「追溯链」）。
- 阶段切换前必须用户确认（仅 Phase 1 无疑问可跳过）。

---

## Phase 1 — 需求分析（5W1H）

**目标**：把模糊输入转为结构化理解，识别歧义和风险。

**先读上下文**（按顺序）：
`CLAUDE.md` → `docs/SPEC.md` → `docs/ARCHITECTURE.md` → `docs/tasks/CURRENT.md` → `docs/tasks/BOARD.md` → `docs/decisions/`

**5W1H 拆解**：Who / What / Why / When / Where / How（方向，不是代码）。

**输出**：

```markdown
## 需求理解 REQ-[流水号]

**核心理解**：[1~3 句概括]
**涉及模块**：[模块 → 影响]
**In Scope**：[做什么]
**Out of Scope**：[本期不做]

**假设与风险**
| 编号 | 内容 | 影响 | 优先级 |
| A1 | …  | …  | 高/中/低 |

**追问清单（最多 3 条）**
1. …
```

**卡点**：所有 High 优先级假设必须澄清后才进 Phase 2。

---

## Phase 2 — 任务拆解（INVEST + 垂直切片）

**目标**：把需求拆成可独立交付、可验收的任务。

**拆解原则**
- INVEST：Independent / Negotiable / Valuable / Estimable / Small / Testable
- 垂直切片：每个 Story 独立交付业务价值，避免纯技术 Task
- 粒度：单任务 ≤ 1 天（AI 约 1~2 轮对话）；超过继续拆
- 测试随功能同步，不单独拆「补测试」任务
- 依赖显式：`depends_on: TASK-XXX`

**层级**：Epic → Story（1~3 天）→ Task（≤1 天）→ Sub-task（可选）

**编号规则**：读 `docs/tasks/BOARD.md` 取最大 TASK 编号 + 1，不与已有冲突。

**输出**：写入 `docs/tasks/BOARD.md`（TODO 区）+ `docs/tasks/CURRENT.md`，每条形如：

```markdown
- [ ] **TASK-XXX** — [标题]（S/M/L） ← 源自 REQ-XXX
  - 输入：[依赖]    输出：[产物]    验收：[Given/When/Then]
  - depends_on：[TASK-YYY 或 无]
```

**卡点**：等用户确认任务清单后再进 Phase 3 或 Phase 4。

---

## Phase 3 — PRD / ARD（按需）

**何时写**
- **PRD**：C 端 / B 端产品功能 → `references/prd-template.md`
- **ARD**：API / 后端服务 / 第三方集成 → `references/ard-template.md`
- 两者都需要：先 PRD 再 ARD
- 仅内部模块改造、无对外契约：可跳过 PRD/ARD，但仍需写 ADR

**ADR**（架构决策记录）
- 路径：`docs/decisions/ADR-XXX-[slug].md`
- 模板：`docs/decisions/template.md`
- 编号：读现有最大编号 + 1
- 内容：1~3 备选方案 + 推荐方案 + AI 指引

**质量门禁**
- [ ] REQ 已确认
- [ ] 所有 High 风险已澄清
- [ ] In/Out Scope 已锁定

**卡点**：PRD/ARD/ADR 写完必须等用户 Review 确认后再进 Phase 4。

---

## Phase 4 — 编码

**复用** `.claude/protocols/feature.md`（不在此重复），本 Skill 仅补充：
- 每个 Task 开始前：BOARD.md 中将该任务从 TODO 移到 IN PROGRESS
- 完成后：移到 DONE 并附完成日期
- 严格遵循 `.claude/rules/`（A001 目录、R001 类型、R002 命名导出、R004 文件 ≤300 行 等）
- 注释语言：中文（与现有代码库一致）
- 不引入未在 ADR 讨论的新依赖

**最小实现优先**：先让验收标准通过，再优化。

---

## Phase 5 — 测试用例

**测试金字塔**

```
       /\   E2E 10%       端到端用户场景，对应 Story 级 AC
      /  \  集成 30%      模块间交互、API 契约
     /____\ 单元 60%      函数 / 类级独立测试
```

**用例设计 6 维度**：Happy Path / 边界值 / 异常输入 / 并发竞态 / 权限安全 / 性能边界。

**编号 + 追溯**：`TC-U01 / TC-I01 / TC-E01`，必须标注覆盖的 `TASK-XXX` 或 `AC-XXX`。

**与 g-harness 项目约定一致**：
- 测试文件统一放 `tests/` 根目录（见 `.claude/rules/architecture.md` A005）
- 路径镜像 `src/`：`src/core/foo.ts` → `tests/core/foo.test.ts`
- 框架：Vitest

---

## Phase 6 — Code Review（评分 + 行动项）

**评分维度（满分 100）**

| 维度 | 权重 | 检查点 |
| 正确性 | 25 | 逻辑、边界、异常路径 |
| 可读性 | 20 | 命名、结构、注释（中文）|
| 可维护性 | 20 | 耦合、单一职责、扩展性 |
| 安全性 | 15 | 输入校验、注入、敏感信息 |
| 性能 | 10 | 复杂度、资源、瓶颈 |
| 测试覆盖 | 10 | 可测性、现有用例质量 |

**评级**：≥90 ✅ 直接合并 · 75~89 🟡 小改 · 60~74 🟠 较多修改 · <60 🔴 重构

**严重度**：🔴 Critical（必改）· 🟠 Major（强烈建议）· 🟡 Minor · 🔵 Nitpick

**输出要求**
- 每个扣分项必须附 文件:行号 + 代码证据 + Before/After 修改建议
- 必须有「亮点」段落，避免单方面负面反馈
- 末尾输出 Blocker / Non-blocker 行动项 + 「下次注意」沉淀

**编号**：`CR-C01 / CR-M01 / CR-N01`，关联到具体 `TASK-XXX` 或 `TC-XXX`。

---

## 跨阶段追溯链

```
REQ-001 → TASK-001 ⇒ ADR-005 ⇒ PRD/ARD ⇒ 代码（feature protocol）⇒ TC-U01 ⇒ CR-C01
   ↑__________________________________________________________________________|
                              （任何节点出问题都能反查）
```

每个产出物在文档/注释/PR 中保留上游 ID，便于回溯和影响分析。

---

## 单阶段切入

| 用户说 | 直接进 | 前置检查 |
| 只帮我写 PRD | Phase 3 | 若无 REQ-XXX 上下文，先反问 1 句确认 In/Out Scope |
| 帮我 review 这段代码 | Phase 6 | 先识别被审查范围（文件/PR/diff）|
| 补 X 模块的测试 | Phase 5 | 若无 TASK 关联，标 `TC-* (orphan)` 提醒补追溯 |
| 拆任务 | Phase 2 | 若无 REQ-XXX，先做 Phase 1 简版（5W1H） |

---

## 约束（与本仓库规则对齐）

- 遵循 `.claude/rules/` 全部硬性规则（架构 / 代码质量 / 依赖 / Git / 安全）
- 遵循 `.claude/protocols/feature.md` 实现细节（Phase 4 不在本文重复）
- ADR / PRD / ARD 必须使用 `references/` 或 `docs/decisions/template.md` 提供的模板
- 任务 ID、ADR 编号、CR 编号递增，绝不与已有冲突
- **不自动执行 `git commit` / `git push`**（除非用户明确要求）
- 阶段切换必须用户确认（Phase 1 无疑问时可直接续）

## 参考模板

- PRD：[`references/prd-template.md`](references/prd-template.md)
- ARD：[`references/ard-template.md`](references/ard-template.md)
- ADR：`docs/decisions/template.md`

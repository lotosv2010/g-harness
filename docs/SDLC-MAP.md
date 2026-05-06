# SDLC 阶段 × 目录映射参考

> 软件工程生命周期各阶段与 g-harness 目录/文件的对照关系。
> 开发新模板或扩展规范时参照此表确保覆盖完整。

---

## 对照表

| 阶段 | protocols/ | rules/ | guardrails/ | hooks/ | skills/ | docs/ & runbooks/ |
|------|-----------|--------|-------------|---------------|---------|-------------------|
| **需求** | `requirements` | — | — | `pre-task` | `feat` | `SPEC.md` |
| **设计** | `api-design` | `architecture` | `boundary-check` | — | `scaffold` | `ARCHITECTURE.md`, `DESIGN.md`, `API.md`, `DATA_MODEL.md`, `decisions/` |
| **实现** | `feature` | `code-quality`, `dependency` | `file-size` | — | `feat`, `scaffold` | `tasks/` |
| **测试** | `testing` | — | `pre-commit`, `coverage-gate` | `post-test` | `test-gen` | — |
| **审查** | `review` | `git` | `secret-scan` | `pre-merge` | `pr` | — |
| **发布** | `deployment` | `safety` | `pre-commit` | `pre-release` | `release` | `runbooks/deployment.md` |
| **运维** | `incident` | — | — | `post-deploy` | `analyze` | `runbooks/incident-response.md` |
| **修复** | `bugfix`, `hotfix` | — | — | — | `debt` | — |
| **回滚** | `rollback` | — | — | — | — | `runbooks/rollback.md` |
| **重构** | `refactor` | `architecture` | `boundary-check` | — | `debt`, `analyze` | — |
| **迁移** | `migration` | `dependency` | — | — | — | — |
| **安全** | — | `safety` | `secret-scan` | — | `security` | — |

---

## 各目录定位

| 目录 | 定位 | 特征 | 面向 |
|------|------|------|------|
| `protocols/` | "怎么做" — 标准化任务执行流程 | 阶段化步骤、明确输入输出 | 流程执行者 |
| `rules/` | "绝不能" — 硬性约束 | 简短、可判定、违反即出事 | 代码编写者 |
| `guardrails/` | "自动检查" — 可编程的校验点 | 有脚本逻辑、可 CI 集成 | 自动化系统 |
| `hooks/` | "事件触发" — 生命周期拦截 | 事件驱动、自动执行 | Claude Code 运行时 |
| `skills/` | "一键执行" — 复合能力封装 | 多步骤组合、可参数化 | AI 助手 |
| `docs/` | "为什么" — 决策与规格记录 | 背景动机、架构约束 | 所有角色 |
| `runbooks/` | "操作手册" — 逐步执行指南 | 具体命令、检查清单 | 运维操作者 |

---

## 文件完整清单

### protocols/ (12)

```
feature.md        — 功能开发流程
bugfix.md         — Bug 修复流程
refactor.md       — 重构流程
review.md         — 代码审查流程
testing.md        — 测试计划流程
migration.md      — 数据/Schema 迁移流程
incident.md       — 事故响应流程
hotfix.md         — 紧急修复流程（快速通道）
rollback.md       — 回滚恢复流程
api-design.md     — API 设计流程
deployment.md     — 部署发布流程
requirements.md   — 需求梳理流程
```

### rules/ (5)

```
architecture.md   — 架构边界（目录职责、依赖方向）
code-quality.md   — 代码质量（类型、命名、复杂度）
safety.md         — 安全约束（密钥、破坏性操作）
git.md            — Git 规范（分支、Commit、合并）
dependency.md     — 依赖管理（引入、版本、License）
```

### guardrails/ (5)

```
boundary-check.md   — 模块边界校验
pre-commit.md       — 提交前检查清单
secret-scan.md      — 敏感信息泄露扫描
file-size.md        — 文件体积超限告警
coverage-gate.md    — 测试覆盖率门禁
```

### hooks/ (7 定义 + 3 运行时脚本，已实装)

```
pre-task.md       — 任务开始前（读取上下文、确认范围）
post-task.md      — 任务完成后（更新看板、生成摘要）
pre-commit.md     — 提交前（触发 guardrails）
pre-merge.md      — 合并前（确认 review 通过）
pre-release.md    — 发布前（changelog、版本号、检查清单）
post-deploy.md    — 部署后（健康检查、通知）
on-error.md       — 错误发生时（日志收集、自动报告）
```

### skills/ (8)

```
feat/             — 端到端需求交付
test-gen/         — 测试用例生成
pr/               — PR 描述生成
release/          — 发版流程
scaffold/         — 代码脚手架
analyze/          — 架构健康度分析
debt/             — 技术债扫描
security/         — 安全审计
```

### docs/ & runbooks/

```
docs/SPEC.md                      — 产品需求规格
docs/ARCHITECTURE.md              — 架构白皮书
docs/DESIGN.md                    — 技术/UI 设计
docs/API.md                       — API 契约
docs/DATA_MODEL.md                — 数据模型
docs/decisions/                   — ADR 架构决策记录
docs/tasks/BOARD.md               — 任务看板
docs/tasks/CURRENT.md             — 活跃任务索引
docs/team/ROLES.md                — 角色分工
docs/runbooks/deployment.md       — 部署操作手册
docs/runbooks/rollback.md         — 回滚操作手册
docs/runbooks/incident-response.md — 事故响应手册
docs/SDLC-MAP.md                  — 本文件（阶段映射参考）
```

---

## 扩展指南

新增文件时遵循以下原则：

1. **确定阶段归属：** 参照上方对照表，确认新文件属于哪个 SDLC 阶段
2. **选择正确目录：** 根据内容性质选择 protocols/rules/guardrails/skills/docs
3. **双份维护：** `.claude/<dir>/` 是 g-harness 自身版本；`src/templates/shared/.ai/<dir>/` 是目标项目模板版本
4. **注册到 categories：** 新增模板文件后在 `src/core/template-categories.ts` 中注册子项
5. **更新本文件：** 保持对照表和清单与实际文件同步

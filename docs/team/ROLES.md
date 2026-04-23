# 角色分工与模块归属（g-forge 项目）

> 定义 g-forge 项目团队的职责范围和模块归属。
> 目标项目的角色模板见 `src/templates/ROLES.template.md`。

---

## 角色定义

### 项目负责人（Owner）
- **职责**：整体架构决策、版本规划、发布审批
- **归属模块**：全局

### 核心开发（Core Dev）
- **职责**：CLI 工具开发、核心规范维护
- **归属模块**：`src/`

### 预设维护（Preset Maintainer）
- **职责**：技术栈预设开发与维护
- **归属模块**：`src/presets/`

### 文档维护（Doc Maintainer）
- **职责**：文档更新、ADR 管理
- **归属模块**：`docs/`、`src/templates/`

---

## 模块归属表

| 模块路径 | 归属角色 | 变更审批 |
|----------|----------|----------|
| `CLAUDE.md` / `AGENTS.md` | 项目负责人 | 需审批 |
| `.claude/rules/` | 项目负责人 | 需审批 |
| `src/content/rules/` | 项目负责人 | 需审批 |
| `src/content/protocols/` | 核心开发 | 需审批 |
| `src/` | 核心开发 | 需审批 |
| `src/presets/` | 预设维护 | 需审批 |
| `src/templates/` | 核心开发 | 需审批 |
| `docs/` | 文档维护 | 自审 |
| `docs/decisions/` | 项目负责人 | 需审批 |
| `tools/` | 核心开发 | 自审 |
| `tests/` | 对应模块开发 | 需审批 |

---

## 审批规则

1. **核心文件变更**（CLAUDE.md、AGENTS.md、规则文件）必须经项目负责人审批
2. **跨模块变更**必须通知所有相关模块归属人
3. **架构决策**必须以 ADR 形式记录并经团队讨论
4. **依赖升级**必须由核心开发审批

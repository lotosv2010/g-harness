# 当前活跃任务

> 实时更新。AI 每次开始工作前先读取本文件。

---

## 当前阶段

**v0.2 — 全部任务已完成**

从"规范框架"升级为"真正的 Harness"——Constraint 层从文档变为可执行闸门，预设系统完整覆盖三大技术栈。

## 活跃任务

无。全部 P0/P1/P2 任务已完成。

## 最近完成

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-021 | 2026-04-24 | skills 通用化：通用 frontmatter + extensions 扩展层（ADR-005） |
| TASK-012 | 2026-04-24 | 编写用户文档 GETTING_STARTED.md |
| TASK-011 | 2026-04-24 | 创建 base 预设（通用技术栈无关） |
| TASK-010 | 2026-04-24 | 创建 node-api 预设（Express/Fastify/Hono） |
| TASK-009 | 2026-04-24 | 创建 vue-nuxt 预设（Vue 3 + Nuxt 3） |
| TASK-008 | 2026-04-24 | gforge migrate：配置文件版本迁移（section-level 合并 + 版本检测） |
| TASK-007 | 2026-04-24 | gforge context sync/check：CLAUDE.md 与项目结构一致性检查和同步 |
| TASK-020 | 2026-04-24 | validate --fix 自动修复（R001、R002、R003） |
| TASK-018 | 2026-04-24 | protocols 可检查化：checklist 格式 + Stop hook 验证遗漏阶段 |
| TASK-017 | 2026-04-24 | gforge check 增量校验：只校验 git diff 变更文件 |
| TASK-016 | 2026-04-24 | guardrails 代码化：boundary-rules.json 配置驱动 + hook 重构 |
| TASK-013 | 2026-04-23 | 分级输出：init 默认核心层，--full 完整输出（含 TASK-019 docs 分层） |
| TASK-014 | 2026-04-23 | 可执行 hook：PostToolUse boundary-check + settings.json 模板 |
| TASK-015 | 2026-04-23 | pre-commit hook：gforge validate 自动校验，阻断不合规提交 |
| TASK-005 | 2026-04-23 | src/ 结构重组：core/ + presets/ + templates/，templates 1:1 镜像目标项目 |
| TASK-004 | 2026-04-23 | 实现 FileGenerator，支持递归遍历 templates/ 和预设叠加 |
| TASK-003 | 2026-04-23 | 实现 ProjectScanner + 技术栈检测（含测试） |
| TASK-002 | 2026-04-23 | 实现 CLI 基础框架（init、validate、context stub、migrate stub） |
| TASK-001 | 2026-04-23 | P0 结构重构完成：单包结构，全部文档更新 |
| TASK-000 | 2026-04-23 | 项目初始架构设计与文档体系 |

## 下一步

全部任务已完成。项目已具备：
- CLI 五大命令：init / validate / check / context / migrate
- 四套预设：react-vite / vue-nuxt / node-api / base
- 可执行闸门：hooks + pre-commit + boundary-rules.json
- 通用 skill 格式：支持跨 AI 工具解析
- 用户文档：GETTING_STARTED.md

可考虑的后续方向：
- 发布 npm 包（v0.2.0）
- 编写 E2E 测试
- 添加更多预设（Python FastAPI 等）
- 自定义规则 API

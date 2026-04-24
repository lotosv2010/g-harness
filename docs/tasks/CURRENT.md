# 当前活跃任务

> 实时更新。AI 每次开始工作前先读取本文件。

---

> **评估结论**：架构方向正确，方法论落地骨架到位，但"自己吃自己狗粮"还没做到位——这是发布前最需要补的短板。

---

## 当前阶段

**v1.1 — Init 交互流程重设计（ADR-007）✓**

重设计 `gforge init` 的完整交互体验，6 阶段引导式 Wizard，同时适用于新建项目和已有项目。全部完成。

## 活跃任务

无。

## Init 交互流程完成概览

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-055 | 2026-04-24 | Scanner 增强：isEmpty/hasGit/existingAgents 检测 |
| TASK-056 | 2026-04-24 | Stage 1 项目检测 + new/existing/reinit 路由 |
| TASK-057 | 2026-04-24 | Stage 2 Agent 智能预选 |
| TASK-058 | 2026-04-24 | Stage 3 预设推荐确认 + 分组列表 |
| TASK-059 | 2026-04-24 | Stage 4 项目元信息收集 |
| TASK-060 | 2026-04-24 | Stage 5 输出层级 + 冲突策略 + hook |
| TASK-061 | 2026-04-24 | Stage 6 确认预览 + 执行 |
| TASK-062 | 2026-04-24 | init.ts 编排重构 + --name/--conflict/--yes |
| TASK-063 | 2026-04-24 | 文档更新（SPEC/README/GETTING_STARTED） |
| TASK-064 | 2026-04-24 | feat skill 模板补充（通用化版本） |

## Agent 适配层完成概览

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-047 | 2026-04-24 | Agent 注册表（AgentDefinition + 6 个 agent） |
| TASK-048 | 2026-04-24 | Agent 入口模板（claude/cursor/windsurf/copilot/trae） |
| TASK-049 | 2026-04-24 | AgentAdapter（目录映射 + 能力过滤） |
| TASK-050 | 2026-04-24 | FileGenerator 多 Agent 改造 |
| TASK-051 | 2026-04-24 | init 交互 Agent 多选（@clack/prompts） |
| TASK-052 | 2026-04-24 | `--agent` CLI 参数（非交互模式） |
| TASK-053 | 2026-04-24 | Agent 适配测试（20 用例全部通过） |
| TASK-054 | 2026-04-24 | 文档更新（SPEC/README/GETTING_STARTED） |

## v1.0 预设扩展规划

| 优先级 | 任务 | 预设 | 目标版本 |
|--------|------|------|----------|
| ~~P0~~ | ~~TASK-037~~ | ~~nuxt（Nuxt 3 + Vue 3）~~ | ~~v1.0~~ ✓ |
| ~~P0~~ | ~~TASK-038~~ | ~~electron（Electron + React/Vue）~~ | ~~v1.0~~ ✓ |
| ~~P1~~ | ~~TASK-039~~ | ~~tauri（Tauri 2 + Rust + 前端）~~ | ~~v1.x~~ ✓ |
| ~~P1~~ | ~~TASK-040~~ | ~~react-native（React Native + Expo）~~ | ~~v1.x~~ ✓ |
| ~~P1~~ | ~~TASK-041~~ | ~~miniprogram（微信小程序）~~ | ~~v1.x~~ ✓ |
| ~~P2~~ | ~~TASK-042~~ | ~~fastapi（Python + FastAPI）~~ | ~~v1.x~~ ✓ |
| ~~P2~~ | ~~TASK-043~~ | ~~express（Express / Hono / Fastify）~~ | ~~v1.x~~ ✓ |
| ~~P2~~ | ~~TASK-044~~ | ~~monorepo（Turborepo / Nx）~~ | ~~v1.x~~ ✓ |
| ~~P3~~ | ~~TASK-045~~ | ~~uniapp（uni-app + Vue 3）~~ | ~~v2.x~~ ✓ |
| ~~P3~~ | ~~TASK-046~~ | ~~flutter（Dart + Flutter）~~ | ~~v2.x~~ ✓ |

## v0.3 完成概览

### P0 自洽性 — 全部完成 ✓

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-022 | 2026-04-24 | ESLint + Prettier 配置补齐 |
| TASK-023 | 2026-04-24 | 10 个测试文件，69 个用例，全部通过 |
| TASK-024 | 2026-04-24 | SPEC.md 状态标记 + 版本路线图同步 |

### P1 代码质量 — 全部完成 ✓

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-025 | 2026-04-24 | 提取 fs-utils.ts，消除 4 模块重复 |
| TASK-026 | 2026-04-24 | 删除死代码 template.ts |
| TASK-027 | 2026-04-24 | version-detector 动态读取 package.json |
| TASK-028 | 2026-04-24 | migrate 变量提取修复（逆向锚点匹配） |
| TASK-029 | 2026-04-24 | CLI 退出码统一 |
| TASK-030 | 2026-04-24 | 错误处理统一（checks 纯函数化） |
| TASK-031 | 2026-04-24 | 模板变量 Schema 文档（ADR-006） |
| TASK-033 | 2026-04-24 | validator checks 纯函数重构 |

### P2 完善度 — 全部完成 ✓

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-032 | 2026-04-24 | 移除 4 个预设中无模板引用的 app_dir/core_dir |
| TASK-034 | 2026-04-24 | hook Regex escapeRegExp + try-catch 防护 |
| TASK-035 | 2026-04-24 | S001 文件命名 + S002 桶文件 export * 检查 |
| TASK-036 | 2026-04-24 | 4 个预设均添加 skills/.gitkeep |

## 质量状态

- TypeCheck：✓ 零错误
- ESLint：✓ 零违规
- Tests：✓ 69/69 通过
- 代码规则自检（R001-R007, A001-A003, S001-S004）：✓ 全部合规

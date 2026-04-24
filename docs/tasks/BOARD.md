# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

> **评估结论**：架构方向正确，方法论落地骨架到位，但"自己吃自己狗粮"还没做到位——这是发布前最需要补的短板。

---

## 待办（TODO）

（暂无）

---

## 进行中（IN PROGRESS）

（暂无）

---

## 已完成（DONE）

- [x] **TASK-064** — feat skill 模板补充（src/templates/.ai/skills/feat/SKILL.md 通用化版本） — 2026-04-24
- [x] **TASK-063** — 文档更新（SPEC/README/GETTING_STARTED 同步 6 阶段交互流程） — 2026-04-24
- [x] **TASK-062** — init.ts 编排重构 + --name/--conflict/--yes flag — 2026-04-24
- [x] **TASK-061** — Stage 6 确认预览 & 执行（dry-run + confirm + 文件树） — 2026-04-24
- [x] **TASK-060** — Stage 5 输出配置交互（层级/冲突策略/hook 开关） — 2026-04-24
- [x] **TASK-059** — Stage 4 项目元信息收集（名称/描述/源码目录） — 2026-04-24
- [x] **TASK-058** — Stage 3 技术栈 & 预设交互（推荐确认 + 分组列表） — 2026-04-24
- [x] **TASK-057** — Stage 2 Agent 选择增强（智能预选已有配置的 agent） — 2026-04-24
- [x] **TASK-056** — Stage 1 项目检测 + 分支路由（new/existing/reinit） — 2026-04-24
- [x] **TASK-055** — Scanner 增强：项目检测信号扩展（13 个测试通过） — 2026-04-24
- [x] **TASK-054** — 文档更新（SPEC.md / README.md / GETTING_STARTED.md 补充 agent 选择说明） — 2026-04-24
- [x] **TASK-053** — Agent 适配测试（20 个用例，覆盖 6 个 agent 的输出路径和过滤） — 2026-04-24
- [x] **TASK-051** — init 交互 Agent 多选（@clack/prompts multiselect + 能力提示） — 2026-04-24
- [x] **TASK-052** — `--agent` CLI 参数（非交互模式，默认 claude，逗号多选 + 友好错误提示） — 2026-04-24
- [x] **TASK-050** — FileGenerator 多 Agent 改造（agents 参数 + AgentAdapter 集成） — 2026-04-24
- [x] **TASK-049** — AgentAdapter 实现（目录映射 + 入口渲染 + 不支持文件过滤） — 2026-04-24
- [x] **TASK-048** — Agent 入口模板（claude/cursor/windsurf/copilot/trae 五套） — 2026-04-24
- [x] **TASK-047** — Agent 注册表（AgentDefinition 接口 + 6 个 agent 配置） — 2026-04-24
- [x] **TASK-046** — 创建 flutter 预设（Feature-First/状态管理/数据层/测试规则） — 2026-04-24
- [x] **TASK-045** — 创建 uniapp 预设（跨端兼容/条件编译/性能规则） — 2026-04-24
- [x] **TASK-044** — 创建 monorepo 预设（包边界/依赖管理/构建缓存/发布规则） — 2026-04-24
- [x] **TASK-043** — 创建 express 预设（三层架构/错误处理/校验/安全规则） — 2026-04-24
- [x] **TASK-042** — 创建 fastapi 预设（Python 分层/Pydantic/DI/异步规则） — 2026-04-24
- [x] **TASK-041** — 创建 miniprogram 预设（小程序目录/组件/性能/审核规则） — 2026-04-24
- [x] **TASK-040** — 创建 react-native 预设（Expo/原生交互/性能/发布规则） — 2026-04-24
- [x] **TASK-039** — 创建 tauri 预设（Rust 命令/事件/安全/构建规则） — 2026-04-24
- [x] **TASK-038** — 创建 electron 预设（主进程/渲染进程/preload 规则） — 2026-04-24
- [x] **TASK-037** — 创建 nuxt 预设（约定式路由/composable/SSR 规则） — 2026-04-24
- [x] **TASK-036** — 预设补充 skills 目录（4 个预设均添加 skills/.gitkeep） — 2026-04-24
- [x] **TASK-035** — Convention 层运行时校验（S001 文件命名 + S002 桶文件 export * 检查） — 2026-04-24
- [x] **TASK-034** — hook Regex 安全加固（escapeRegExp + try-catch 防护） — 2026-04-24
- [x] **TASK-032** — 清理预设冗余变量（移除 4 个预设中无模板引用的 app_dir/core_dir） — 2026-04-24
- [x] **TASK-033** — validator checks 改为纯函数（返回 Violation[] 替代 mutation） — 2026-04-24
- [x] **TASK-031** — 模板变量 Schema 文档（ADR-006：23 个变量来源和格式说明） — 2026-04-24
- [x] **TASK-030** — 统一错误处理（checks 纯函数化消除 mutation 模式） — 2026-04-24
- [x] **TASK-029** — 统一 CLI 退出码（migrate + context sync 补齐退出码） — 2026-04-24
- [x] **TASK-028** — 修复 migrate 变量提取（逆向模板锚点匹配，替代空桩函数） — 2026-04-24
- [x] **TASK-027** — version-detector 动态读取 package.json（替代硬编码 0.1.0） — 2026-04-24
- [x] **TASK-026** — 删除死代码 template.ts — 2026-04-24
- [x] **TASK-025** — 提取 fs-utils.ts（fileExists/readDirSafe/isDirectory/statSafe） — 2026-04-24
- [x] **TASK-024** — 同步 SPEC.md 状态标记（全部验收标准 + 版本路线图更新） — 2026-04-24
- [x] **TASK-023** — 补齐核心模块测试（10 个测试文件，69 个测试用例全部通过） — 2026-04-24
- [x] **TASK-022** — 补齐 ESLint + Prettier 配置（eslint.config.js + .prettierrc） — 2026-04-24
- [x] **TASK-021** — skills 通用化（通用 frontmatter + extensions 扩展层） — 2026-04-24
- [x] **TASK-012** — 编写用户文档（GETTING_STARTED.md） — 2026-04-24
- [x] **TASK-011** — 创建 base 预设 — 2026-04-24
- [x] **TASK-010** — 创建 node-api 预设 — 2026-04-24
- [x] **TASK-009** — 创建 vue-nuxt 预设 — 2026-04-24
- [x] **TASK-008** — gforge migrate 配置文件迁移 — 2026-04-24
- [x] **TASK-007** — gforge context sync/check — 2026-04-24
- [x] **TASK-020** — validate --fix 自动修复（R001、R002、R003） — 2026-04-24
- [x] **TASK-018** — protocols 可检查化（checklist 格式 + Stop hook 验证） — 2026-04-24
- [x] **TASK-017** — gforge check 增量校验（git diff 变更文件） — 2026-04-24
- [x] **TASK-016** — guardrails 代码化（boundary-rules.json 配置驱动） — 2026-04-24
- [x] **TASK-019** — docs/ 模板分层（随 TASK-013 完成） — 2026-04-23
- [x] **TASK-015** — validate 接入 pre-commit hook — 2026-04-23
- [x] **TASK-014** — 可执行 hook（PostToolUse boundary-check + settings.json） — 2026-04-23
- [x] **TASK-013** — 分级输出（init 默认核心层，--full 完整输出） — 2026-04-23
- [x] **TASK-005** — src/ 结构重组 — 2026-04-23
- [x] **TASK-004** — 实现 FileGenerator — 2026-04-23
- [x] **TASK-003** — 实现 ProjectScanner — 2026-04-23
- [x] **TASK-002** — 实现 CLI 基础框架 — 2026-04-23
- [x] **TASK-001** — P0 结构重构 — 2026-04-23
- [x] **TASK-000** — 项目初始架构设计 — 2026-04-23

---

## 阻塞（BLOCKED）

（暂无）

---

## 规则

1. 任务 ID 格式：`TASK-XXX`，递增
2. 每个任务标注优先级（P0/P1/P2）和负责人
3. 任务移动时更新日期
4. 已完成任务保留 7 天后归档

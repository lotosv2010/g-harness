# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

> **评估结论**：架构方向正确，方法论落地骨架到位，但"自己吃自己狗粮"还没做到位——这是发布前最需要补的短板。

---

## 待办（TODO）

### v1.0 — 预设扩展

| 任务 | 优先级 | 预设名 | 技术栈 | 说明 |
|------|--------|--------|--------|------|
| TASK-037 | P0 | `nuxt` | Nuxt 3 + Vue 3 | 与 Next.js 对称，约定式路由/server 规则和 vite-vue 差异显著 |
| TASK-038 | P0 | `electron` | Electron + React/Vue | 桌面端，主进程/渲染进程边界规则独特 |
| TASK-039 | P1 | `tauri` | Tauri 2 + Rust + 前端 | 新一代桌面端，Rust 后端 + Web 前端跨语言约束 |
| TASK-040 | P1 | `react-native` | React Native + Expo | 移动端头部方案，平台特定规则多 |
| TASK-041 | P1 | `miniprogram` | 微信小程序 | 国内小程序开发量大，独特文件结构和 API 约束 |
| TASK-042 | P2 | `fastapi` | Python + FastAPI | Python 后端头部方案，扩展非 JS 生态 |
| TASK-043 | P2 | `express` | Express / Hono / Fastify | 轻量 Node.js API，不需要 NestJS 全套装饰器时使用 |
| TASK-044 | P2 | `monorepo` | Turborepo / Nx + pnpm workspace | Monorepo 工程治理，跨包边界和发布规则 |
| TASK-045 | P3 | `uniapp` | uni-app + Vue 3 | 跨端小程序方案 |
| TASK-046 | P3 | `flutter` | Dart + Flutter | 跨端移动开发 |

---

## 进行中（IN PROGRESS）

（暂无）

---

## 已完成（DONE）

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

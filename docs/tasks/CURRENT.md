# 当前活跃任务

> 实时更新。AI 每次开始工作前先读取本文件。

---

> **评估结论**：架构方向正确，方法论落地骨架到位，但"自己吃自己狗粮"还没做到位——这是发布前最需要补的短板。

---

## 当前阶段

**v1.4 — Deep Agent 驱动规范生成（实施中）**

引入 LangGraph.js + `deepagents`，让 CLI 自主分析老/新项目并生成贴合实际的完整规范套件。

- ADR：`docs/decisions/ADR-010-deepagent-generation.md` ✅
- 任务：TASK-082 ~ TASK-100（共 19 个）
- 三级降级链：deep-agent → llm-enhance（v1.3） → template（v1.0）
- 三档深度：shallow / medium / deep，用户自选

**v1.3（智能补全 + 项目索引）已完成**：TASK-069 ~ TASK-081 全部 ✓。

## v1.4 进度

### P0 — 基础设施 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-082 | S | ✅ 新增 optionalDependencies + lazy-import 管线 |
| TASK-083 | S | ✅ 类型层 + DEPTH_PROFILES 三档常量 |
| TASK-084 | S | ✅ 工具安全层（assertPathSafe + 黑名单） |
| TASK-085 | M | ✅ 7 个只读工具（zod schema + format 函数） |
| TASK-086 | M | ✅ 6 份预设 knowledge base（≥200 行） |
| TASK-087 | M | ✅ Agent Factory + 三级降级编排 |
| TASK-088 | S | ✅ CostTracker / StepLimiter / TimeoutGuard |

### P1 — Agent 主流程 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-089 | M | ✅ 系统 Prompt + 4 子 Agent Prompt |
| TASK-090 | L | ✅ runDeepAgent 主入口（预检/构建/运行/提取/trace/降级） |
| TASK-091 | S | ✅ Trace JSONL 写入器（步事件 + 末尾 summary） |
| TASK-092 | M | ✅ Pre-flight 预估（estimateRun + formatEstimate） |

### P1 — 集成到 init 命令 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-093 | M | ✅ FileGenerator 新增 mode + depth + onDeepAgentResult |
| TASK-094 | M | ✅ Stage 5 模式三选一 + 深度子菜单 + 预估展示 |
| TASK-095 | S | ✅ CLI flag `--deep-agent` + `--depth` + 非交互降级 |
| TASK-096 | S | ✅ Stage 6 预览展示模式 / 预估 / 降级策略 |

### P2 — 稳健化 & 文档（进行中）
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-097 | M | ⏸ 受控实测 + 成本校准（需真实 API key） |
| TASK-098 | M | ✅ askUser 工具 + Human-in-the-loop（ADR 问题数 profile 硬上限） |
| TASK-099 | M | ✅ 文档更新（README / GETTING_STARTED / SPEC / ARCHITECTURE / CURRENT） |
| TASK-100 | M | ⏸ E2E 烟雾测试（FakeModel） |

### v1.4.1 — Provider / Model / API Key 交互选择 ✅
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-101 | M | ✅ ADR-011：列表选 provider/model + env 支持 + `--model`/`--provider`/`--api-key` CLI（2026-04-25） |

- ADR：`docs/decisions/ADR-011-model-key-interactive-selection.md` ✅
- 交互：Stage 5 在选定 llm-enhance / deep-agent 后依次选 Provider → Model → API Key（env 已设则跳过）
- CLI：`--model <id>` 校验 + provider 反查；`--provider` 显式指定；`--api-key <key>` 显式传入（运行时打印 shell history 警告，鼓励改用 env）；`--model` 与 `--provider` 冲突报错
- 影响：`llm-completer.ts` 去除硬编码模型；`runDeepAgent` 新增 `model`/`apiKey` 透传

## 活跃任务

v1.4 剩余：TASK-097（受控实测）与 TASK-100（E2E）需真实运行环境，留到后续实测阶段推进。

## v1.3 进度

### P0 — 核心闭环 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-069 | S | ✅ 修复 meta 数据流断链 |
| TASK-070 | M | ✅ 扫描器增强：路由 + 模块 + 入口解析 |
| TASK-071 | M | ✅ 索引模板 + `gforge index` 命令 |
| TASK-072 | M | ✅ 描述分析器 MVP（规则版） |
| TASK-073 | M | ✅ 预设片段库（nextjs/nestjs/vite-react） |
| TASK-074 | S | ✅ 协议硬化：AI 必读索引约定 |

### P1 — 流程完整性 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-075 | M | ✅ init 老项目双模式（auto-describe + Stage 4 二选一） |
| TASK-076 | S | ✅ `gforge index --watch`（500ms 防抖 + 内容差异跳过） |
| TASK-077 | M | ✅ 新增 3 个 Workflow 协议（requirements/testing/deployment） |
| TASK-078 | M | ✅ 框架特定约束库（app-router-rules/module-rules/component-rules） |

### P2 — 体验优化 ✅ 全部完成
| 任务 | 复杂度 | 状态 |
|------|--------|------|
| TASK-079 | L | ✅ LLM 补全层（Anthropic/OpenAI + 白名单字段 + 透明降级） |
| TASK-080 | S | ✅ 索引漂移检测（`gforge index --check`） |
| TASK-081 | M | ✅ test-gen / scaffold 与索引联动 |

## 工程生命周期补全完成概览

| 任务 | 完成日期 | 说明 |
|------|----------|------|
| TASK-065 | 2026-04-24 | 4 个新 skill（release/security/debt/pr）g-forge 自身版 |
| TASK-066 | 2026-04-24 | 4 个 skill 模板版本（通用化，供目标项目使用） |
| TASK-067 | 2026-04-24 | 3 个新协议（incident/migration/api-design）g-forge 自身版 |
| TASK-068 | 2026-04-24 | 3 个协议模板版本（通用化，带 checklist + Stop hook 标记） |

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
- Tests：✓ 48/48 通过（v1.3 新增 31 个用例：description(8) + content-completer(4) + auto-describe(8) + llm-completer(9) + index-drift(6) + detect-project(13)，覆盖分析器 + 索引器 + 扫描器）
- 代码规则自检（R001-R007, A001-A003, S001-S004）：✓ 全部合规

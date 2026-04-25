# 任务看板

> 多任务并行追踪。按状态和优先级组织。
> AI 在接收新任务前应检查本文件避免冲突。

---

> **评估结论**：架构方向正确，方法论落地骨架到位，但"自己吃自己狗粮"还没做到位——这是发布前最需要补的短板。

---

## 待办（TODO）

> **v1.4 规划 — Deep Agent 驱动规范生成（ADR-010）**
> 目标：引入 LangGraph + `deepagents`，让 CLI 能自主分析老/新项目并生成贴合实际的完整规范套件。
> 来源：2026-04-25 用户需求（"接入 langchain 的 deep agent 自动分析项目生成各种 MD 约束文件"）。

### P0 — 基础设施 + 可运行骨架（2 周）

- [x] **TASK-082** — 新增依赖 + 可选加载管线（S） — 2026-04-24 完成
  - 输入：无
  - 输出：`package.json` 新增 `optionalDependencies`：`deepagents` / `@langchain/langgraph` / `@langchain/core` / `@langchain/anthropic` / `@langchain/openai` / `zod`；新增 `src/core/agents/deep-agent/lazy-import.ts`（统一动态 import + 缺失时返回 null）
  - 验收：不启用 deep-agent 时 `pnpm install --prod` 不拉取这些包；`lazy-import` 单测覆盖"依赖缺失"与"依赖存在"两种路径
  - 依赖：无

- [x] **TASK-083** — Deep Agent 类型层 + 配置（S） — 2026-04-24 完成
  - 输入：ADR-010
  - 输出：`src/core/agents/deep-agent/types.ts`（`Depth` / `DeepAgentOptions` / `DeepAgentResult` / `DraftFile` / `CostReport`）；`config.ts`（三档 depth 的步数/token/超时上限常量表）
  - 验收：类型完整导出；常量表覆盖 shallow/medium/deep 三档
  - 依赖：TASK-082

- [x] **TASK-084** — 工具安全层（S） — 2026-04-24 完成
  - 输入：ADR-010 工具白名单
  - 输出：`deep-agent/tools/security.ts`：`assertPathSafe(path, targetDir)` + 黑名单（`.env*` / `*.pem` / `id_rsa*` / `.git` / `node_modules` / `dist` / `coverage`）
  - 验收：6+ 个单测覆盖目标外路径、黑名单扩展、符号链接逃逸、相对路径穿越
  - 依赖：TASK-083

- [x] **TASK-085** — 只读工具集（M） — 2026-04-24 完成
  - 输入：TASK-084
  - 输出：`deep-agent/tools/` 下 7 个工具：`read-index` / `read-package-json` / `read-readme`（250 行上限）/ `list-dir` / `read-file`（500 行上限）/ `grep`（200 条上限）/ `read-preset-knowledge`；每个工具用 `zod` 定义 schema
  - 验收：每个工具有独立单测（输入校验 + 结果格式 + 错误路径）；所有 tool 注册在 `tools/index.ts`
  - 依赖：TASK-084

- [x] **TASK-086** — 预设 knowledge base（M） — 2026-04-25 完成
  - 输入：ADR-010
  - 输出：`deep-agent/knowledge/` 下 6 个 markdown：`nextjs.md` / `nestjs.md` / `vite-react.md` / `nuxt.md` / `electron.md` / `fastapi.md`；每份包含分层、模块边界、常见陷阱、推荐 rules/protocols
  - 验收：6 个文件 ≥ 200 行有效内容；`read-preset-knowledge` 能正确检索
  - 依赖：TASK-085

- [x] **TASK-087** — Agent Factory + 降级链（M） — 2026-04-25 完成
  - 输入：TASK-082~086
  - 输出：`deep-agent/agent-factory.ts`（`createDeepAgent` 封装：depth → tools → model/provider → 步数限制）；`deep-agent/fallback.ts`（deep → llm-enhance → template 三级降级）
  - 验收：工厂可基于 depth 产出不同工具集；fallback 单测覆盖三档降级触发
  - 依赖：TASK-085、TASK-086

- [x] **TASK-088** — 成本追踪 + 步数/超时护栏（S） — 2026-04-25 完成
  - 输入：TASK-087
  - 输出：`deep-agent/guards/cost-tracker.ts`（聚合 `usage_metadata` + 模型价目表）；`step-limiter.ts`（循环步数上限）；`timeout.ts`（AbortController 包装）
  - 验收：cost-tracker 单测（anthropic + openai 两组价目）；超限触发降级而非抛错
  - 依赖：TASK-087

### P1 — Agent 主流程（2 周）

- [x] **TASK-089** — 系统 Prompt + 子 Agent Prompt（M） — 2026-04-25 完成
  - 输入：ADR-010
  - 输出：`deep-agent/prompts/system-prompt.ts`（主 Agent，含 `OUTPUT_WHITELIST_DEFAULT` + `buildSystemPrompt`）；`subagent-prompts.ts`（4 个子 agent：spec-writer / architecture-writer / rules-writer / entry-writer，含深度感知行为）
  - 验收：prompt 显式要求产出白名单文件清单；系统提示包含"优先读索引"约定（呼应 ADR-008）；typecheck + lint PASS
  - 依赖：TASK-087

- [x] **TASK-090** — runDeepAgent 主入口（L） — 2026-04-25 完成
  - 输入：TASK-088、TASK-089
  - 输出：`deep-agent/index.ts` 导出 `runDeepAgent(options): Promise<DeepAgentResult>`；编排预检（依赖/provider/key）→ 构建（agent-factory + subagents）→ 运行（stream 优先、invoke 兜底）→ 提取白名单草稿 → trace 写入 → 降级返回
  - 验收：typecheck + lint PASS；失败路径全部走降级（deps-missing / no-key / timeout / step-limit / token-limit / parse-error / network-error）；单次成功返回 `{ status, drafts, cost, tracePath }`
  - 依赖：TASK-088、TASK-089

- [x] **TASK-091** — Trace 写入器（S） — 2026-04-25 完成
  - 输入：TASK-090
  - 输出：`deep-agent/trace/trace-writer.ts`：按时间戳写 `docs/.gforge/agent-trace-{ts}.jsonl`，每行一条 step（thought/tool_call/tool_result/message/error）+ 末尾 summary 行；`makeStepEvent` 辅助
  - 验收：JSONL 格式合法；首次写入自动 `mkdir -p`；写入失败静默（不得反杀主流程）；runDeepAgent 每步实时 append，末尾写 summary
  - 依赖：TASK-090

- [x] **TASK-092** — Pre-flight 预估报告（M） — 2026-04-25 完成
  - 输入：TASK-088
  - 输出：`deep-agent/preflight.ts`：`estimateRun` 基于三档 baseline 系数 + 项目源文件采样估算 `EstimateReport`；`formatEstimate` 输出人类可读字符串（包含价目日期）；采样跳过 node_modules/.git/dist 等
  - 验收：shallow 零采样、medium ≤ 8、deep ≤ 20；费用计算复用 `calcCost`；上界不超过本档 maxTokens 与 totalTimeoutMs；typecheck + lint PASS
  - 依赖：TASK-088

### P1 — 集成到 init 命令（1 周）

- [x] **TASK-093** — FileGenerator 生成模式分支（M） — 2026-04-25 完成
  - 输入：TASK-090
  - 输出：`GenerateOptions` 新增 `mode: GenerateMode` + `depth?: Depth` + `onDeepAgentResult` 回调；`runDeepAgentIfRequested` 在 deep-agent 模式下调用 `runDeepAgent`，白名单草稿覆盖同路径模板（跳过 `resolveVariables`），失败透明降级到模板路径
  - 验收：typecheck + lint PASS；Agent 成功时草稿直出、失败（deps-missing/no-key/timeout/等）走模板路径；partialDrafts 非空时仍能部分覆盖
  - 依赖：TASK-090

- [x] **TASK-094** — Stage 5 新增生成模式选择 + 深度子菜单（M） — 2026-04-25 完成
  - 输入：TASK-092、TASK-093
  - 输出：`init-interactive.ts` Stage 5 新增生成模式三选一（template / llm-enhance / deep-agent）+ 深度子菜单（shallow / medium / deep）；选 deep-agent 时调用 `estimateRun` 即时展示预估；无 API key / 缺 Deep Agent 依赖时自动隐藏对应选项
  - 验收：typecheck + lint PASS；`OutputConfig` 新增 `mode` + `depth` 字段；`isDeepAgentAvailable` 基于 `loadDeepAgentDeps()` 动态探测依赖
  - 依赖：TASK-093

- [x] **TASK-095** — CLI flag `--deep-agent` + `--depth`（S） — 2026-04-25 完成
  - 输入：TASK-094
  - 输出：`init.ts` 新增 `--deep-agent` / `--depth shallow|medium|deep`；`parseDepthFlag` 对无效值友好报错（exit 1）；非交互模式下 deep-agent 自动探测依赖 + API key，缺失时友好降级到 llm-enhance 或 template
  - 验收：typecheck + lint PASS；CLI 描述文字齐全；非交互模式三档降级路径覆盖
  - 依赖：TASK-094

- [x] **TASK-096** — Stage 6 预览增强（S） — 2026-04-25 完成
  - 输入：TASK-092、TASK-095
  - 输出：`PreviewSummary` 新增 `mode` / `depth` / `estimateLine`；`stage6Confirm` 在 deep-agent 模式下额外展示预估行 + 降级策略说明；`init.ts` 在预览阶段调用 `estimateRun` + `formatEstimate` 生成预估；`onDeepAgentResult` 回调打印成功的草稿数/费用/trace 路径或降级原因
  - 验收：typecheck + lint PASS；预览明确显示生成模式与预估
  - 依赖：TASK-095

### P2 — 稳健化 & 文档

- [ ] **TASK-097** — 受控实测 + 成本校准（M）— 延后到真实 API key 环境
  - 输入：TASK-090
  - 输出：对 g-forge 自身 + 3 个 fixture 项目（nextjs/nestjs/vite-react 最小仓）跑 deep-agent；记录实际 token/费用/耗时；校准 `preflight.ts` 的预估系数
  - 验收：实测报告落到 `docs/runbooks/deep-agent-benchmark.md`；预估误差 ≤ 30%
  - 依赖：TASK-096

- [x] **TASK-098** — 可选 askUser 工具 + Human-in-the-loop（M） — 2026-04-25 完成
  - 输入：TASK-090
  - 输出：`tools/ask-user.ts::createAskUser` 工厂（状态闭包，累计提问数）；shallow 禁用 / medium≤2 / deep≤3（复用 `DEPTH_PROFILES.askUserLimit`）；非交互 TTY / 用户取消 / 空答 / 超限均返回带前缀的拒绝字符串；agent-factory 仅在 `enableAskUser && askUserLimit > 0` 时注册 `ask_user` 工具
  - 验收：typecheck + lint PASS；问题数超限自动拒绝；非交互模式下该工具静默禁用（返回拒绝字符串）；@clack/prompts 与主流程共享 stdin
  - 依赖：TASK-090

- [x] **TASK-099** — 文档更新（M） — 2026-04-25 完成
  - 输入：TASK-096
  - 输出：
    - `README.md` 快速开始新增 `--deep-agent --depth` 示例 + Deep Agent 模式大段说明（三档 depth / 白名单 / 降级链 / trace）
    - `GETTING_STARTED.md` 新增 **2.5 Deep Agent 模式** 小节（依赖安装 / 深度表 / CLI 示例 / 10 份输出白名单 / 三级降级 / 可观测性）
    - `docs/SPEC.md` 新增 **FR-08 Deep Agent 自主生成**（优先级 P1、三档深度、工具白名单、输出白名单、降级链、可观测性、验收标准全钩）+ 版本路线图新增 v1.4 行
    - `docs/ARCHITECTURE.md` 新增 **3.9 agents/deep-agent 子系统**（目录树 + 关键约束）+ 决策表新增 ADR-010 行
    - `docs/tasks/CURRENT.md` 当前阶段改为"实施中" + 新增 v1.4 完整进度表（P0/P1/P2）
  - 验收：typecheck + lint 全绿；ADR-010 在 ARCHITECTURE 决策表中；FR-08 覆盖所有 v1.4 能力
  - 依赖：TASK-096

- [x] **TASK-100** — E2E 烟雾测试（M）✅ 2026-04-25
  - 输入：TASK-099
  - 输出：`src/core/agents/deep-agent/e2e.test.ts` 通过 `vi.mock` 隔离 `lazy-import` + `agent-factory`，覆盖 8 条路径：deps-missing / no-key / apiKey-without-provider / parse-error / success + 白名单过滤 / network-error / trace JSONL 合法性 / unsupported
  - 验收：CI 可跑零依赖（无需真实 LangChain 或 API key）；8 个用例全部通过；trace summary 行验证 draftFiles 包含 AGENTS.md
  - 依赖：TASK-099

- [x] **TASK-101** — Provider / Model / API Key 交互选择（M）✅ 2026-04-25
  - 输入：用户反馈"使用大模型增强是怎么没有让我选择大模型和输入对应的 key"
  - 输出：
    - `docs/decisions/ADR-011-model-key-interactive-selection.md` — 决策记录
    - `src/core/agents/deep-agent/config.ts` 新增 `ANTHROPIC_MODEL_CHOICES` / `OPENAI_MODEL_CHOICES` / `getModelChoices` / `listModelIds` / `inferProviderFromModel`
    - `src/core/agents/deep-agent/types.ts` `DeepAgentOptions` 新增 `model?` + `apiKey?`
    - `src/core/agents/deep-agent/index.ts` `resolveProvider` 重构为 `resolveCredentials`（优先级：options > env）
    - `src/core/analyzer/llm-completer.ts` 参数化 `model` / `apiKey`，移除硬编码
    - `src/core/commands/init-interactive.ts` Stage 5 新增 `pickProviderModelKey`（provider select → model select → `p.password` key）
    - `src/core/commands/init.ts` 新增 `--model` / `--provider` flag，`parseModelFlag` 校验 + provider 反查；透传至 `FileGenerator`
    - `src/core/generator/file-generator.ts` `GenerateOptions` 新增 `provider` / `model` / `apiKey` 并传给 `runDeepAgent` + `enhanceWithLlm`
    - 文档更新（`GETTING_STARTED.md` / `SPEC.md` / `ARCHITECTURE.md` / `CURRENT.md`）
  - 验收：typecheck + lint 全绿；交互模式可选 provider + model + 输入 key；`--model` 非法值友好报错；`--model` 与 `--provider` 冲突时 exit 1；`--api-key` 允许传入但运行时打印 shell history 警告（2026-04-25 按用户确认修订）
  - 依赖：TASK-099

### P0 — 核心闭环（1-2 周）

- [x] **TASK-069** — 修复 meta 数据流（`projectDescription` 未传递至 generator）（S）✅ 2026-04-24
  - 输入：`stage4CollectMeta()` 产出的 `ProjectMeta`
  - 输出：扩展 `GenerateOptions.meta` + `buildVariables()` 读取 meta 替代硬编码
  - 验收：生成的 SPEC.md / CLAUDE.md 中 `{{project_description}}` 被真实替换
  - 依赖：无

- [x] **TASK-070** — 扫描器增强：路由 + 模块 + 入口解析（M）✅ 2026-04-24
  - 输入：目标项目源码
  - 输出：`src/core/indexer/route-parser.ts`、`module-extractor.ts`、`feature-mapper.ts`
  - 验收：支持 Next.js App Router / Pages Router / Nuxt / Express / React Router / Vue Router 等路由识别
  - 依赖：无

- [x] **TASK-071** — 索引模板 + 新增 `gforge index` 命令（M）✅ 2026-04-24
  - 输入：TASK-070 的扫描结果
  - 输出：
    - `src/templates/docs/PROJECT_MAP.template.md`（模块清单 → 文件）
    - `src/templates/docs/FEATURES.template.md`（功能清单 → 入口）
    - `src/templates/docs/ROUTES.template.md`（路由表 → handler）
    - `src/core/commands/index-cmd.ts`（gforge index 命令，已注册到 CLI）
  - 验收：`gforge index` 能在目标项目生成 3 个索引文件，内容与实际代码一致（已在 g-forge 自身验证）
  - 依赖：TASK-070

- [x] **TASK-072** — 描述分析器 MVP（规则版，不依赖 LLM）（M）✅ 2026-04-24
  - 输入：`projectDescription` + `preset` + `scanResult`
  - 输出：`src/core/analyzer/description-analyzer.ts` + `content-completer.ts`（11 单测 PASS）
  - 验收：识别应用类型（web-app/api/fullstack/mobile/desktop/cli/library）、8 个领域规则、23 功能关键词、推荐模块清单
  - 依赖：TASK-069

- [x] **TASK-073** — 预设片段库 — 补全 SPEC/ARCHITECTURE 内容（M）✅ 2026-04-24
  - 输入：TASK-072 的分析结果
  - 输出：`preset.json` 扩展 `fragments` 字段（architectureLayers / defaultModules / structureHint / extraNfr），content-completer 接受并覆盖默认值；nextjs / nestjs / vite-react 三个预设已实装
  - 验收：三个主流预设覆盖 fullstack / api / web-app 三类领域，含专属分层/模块/NFR
  - 依赖：TASK-072

- [x] **TASK-074** — 协议硬化：AI 必读索引文件约定（S）✅ 2026-04-24
  - 输入：TASK-071 产出的索引文件
  - 输出：CLAUDE.template.md 上下文顺序改为 PROJECT_MAP/FEATURES/ROUTES 优先，feature/bugfix 协议模板阶段 1 显式要求读索引
  - 验收：上下文优先列表中 PROJECT_MAP.md 排在第 2 位（本文件除外），两个协议阶段 1 包含"禁止未读索引就整库扫描"条款
  - 依赖：TASK-071

### P1 — 流程完整性（1-2 周）

- [x] **TASK-075** — init 老项目分支：自动分析 vs 手动输入双模式（M）✅ 2026-04-24
  - 输出：`src/core/analyzer/auto-describe.ts`（package.json + README 提取）、Stage 4 扩展 auto/manual 二选一、非交互模式同步接入、`ProjectMeta.source` 追踪来源
  - 验收：8 个单测覆盖空目录/name 提取/description 提取/README 兜底/徽章剥离/优先级/截断/损坏 JSON；老项目场景可跳过逐项输入
  - 依赖：TASK-070、TASK-072、TASK-073

- [x] **TASK-076** — `gforge index --watch` 增量更新（S）✅ 2026-04-24
  - 输出：`gforge index --watch` 监听 `src/` 递归变化，500ms 防抖合并高频事件；内容未变化时跳过写入避免下游 watcher 级联；支持 Ctrl+C 优雅退出
  - 验收：启动即首次全量刷新（本仓约 100ms）；文件变化触发重扫并仅写变化文件；不改变现有 CLI 其他行为
  - 依赖：TASK-071

- [x] **TASK-077** — 新增 Workflow 协议：requirements / testing / deployment（M）✅ 2026-04-24
  - 输出：`.claude/protocols/` 3 个（叙述格式）+ `src/templates/.ai/protocols/` 3 个（checklist + Stop 标记）
  - 验收：覆盖需求梳理、测试计划、部署流程三个阶段，模板版含 `[✓ 阶段N]` Stop 标记
  - 依赖：无

- [x] **TASK-078** — 框架特定约束库（M）✅ 2026-04-24
  - 输出：nextjs/app-router-rules.md（6 规则）、nestjs/module-rules.md（6 规则）、vite-react/component-rules.md（7 规则）
  - 验收：文件位于 preset `rules/` 目录，FileGenerator 已自动合并到 `.claude/rules/`（`collectRecursive` 扫描覆盖）
  - 依赖：无

### P2 — 体验优化

- [x] **TASK-079** — LLM 补全层（可选，检测到 API key 启用）（L）✅ 2026-04-24
  - 输出：`src/core/analyzer/llm-completer.ts`（Anthropic / OpenAI 双供应商、白名单字段覆盖、代码块围栏容错、超时/网络错误/解析错误透明降级）；`FileGenerator` 新增 `useLlm` + `onLlmResult`；`gforge init --llm` CLI 选项
  - 验收：9 个单测覆盖 no-key/anthropic 成功/围栏解析/parse-error/HTTP 非 2xx/AbortError/openai 路径/empty/白名单外字段；无 API key 场景返回 `enhanced=false reason=no-key` 且不影响规则版输出
  - 依赖：TASK-072

- [x] **TASK-080** — 索引漂移检测（S）✅ 2026-04-24
  - 输出：`src/core/indexer/index-drift.ts` + `index --check` CLI 选项；识别 added / removed / dangling 三类漂移；发现漂移时 exit 1
  - 验收：6 个单测覆盖无索引/模块新增/模块删除/路由新增/文件悬空/完全一致；CLI `--check` 已在 help 输出
  - 依赖：TASK-071

- [x] **TASK-081** — `test-gen` / `scaffold` skill 与索引联动（M）✅ 2026-04-24
  - 输出：`src/templates/.ai/skills/{test-gen,scaffold}/SKILL.md` 与 `.claude/skills/{test-gen,scaffold}/SKILL.md` 执行步骤新增"读索引"前置步骤与"刷新索引"后置步骤；约束条款新增"索引优先"条目
  - 验收：两个 skill 在执行步骤与约束中均显式要求读写索引；test-gen 反查 exports，scaffold 查重并定位目录模式
  - 依赖：TASK-071

---

## 进行中（IN PROGRESS）

（暂无）

---

## 已完成（DONE）

- [x] **TASK-068** — 3 个协议模板版本（src/templates/.ai/protocols/{incident,migration,api-design}.md） — 2026-04-24
- [x] **TASK-067** — 3 个新协议 g-forge 版（.claude/protocols/{incident,migration,api-design}.md） — 2026-04-24
- [x] **TASK-066** — 4 个 skill 模板版本（src/templates/.ai/skills/{release,security,debt,pr}/SKILL.md 通用化） — 2026-04-24
- [x] **TASK-065** — 4 个新 skill g-forge 版（.claude/skills/{release,security,debt,pr}/SKILL.md） — 2026-04-24
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

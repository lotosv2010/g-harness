# G-Forge 产品说明书 & 需求规格说明书

> 本文件是 G-Forge 项目的核心需求文档，合并产品定义与需求规格。
> AI 在做任何功能决策、架构决策前必须参考本文件。

---

## 第一部分：产品说明书

### 1.1 产品定位

G-Forge 是一套**面向 AI 编程助手优化的通用工程化规范框架 + CLI 工具**（Harness Engineering 范式），旨在通过结构化的规则、协议、模板和预设，引导 AI 在任意技术栈的项目中持续输出一致的、生产级的代码。

**一句话定义：** 让 AI 遵守你的工程规范，而不是你适应 AI 的输出。

### 1.2 核心价值

| 价值 | 描述 |
|------|------|
| 结构化上下文 | 让 AI 快速理解任何项目的技术栈、架构和约束 |
| 自动化约束 | 通过规则引擎阻止 AI 生成不合规代码 |
| 标准化工作流 | 让团队 AI 协作方式一致，降低审查成本 |
| 渐进式迁移 | 新老项目无痛接入，第 1 天即可体验价值 |
| 多技术栈支持 | 通过预设系统适配不同框架和语言 |

### 1.3 目标用户

| 用户画像 | 核心需求 | 使用场景 |
|----------|----------|----------|
| 技术团队 Leader | 统一团队 AI 开发规范 | 团队全员接入 G-Forge，降低代码审查成本 |
| 架构师 | 维持 AI 协作下的架构完整性 | 通过规则和护栏约束 AI 不破坏架构边界 |
| 独立开发者 | 快速搭建最佳实践项目结构 | `gforge init` 一键初始化规范 |
| AI 工具开发者 | 集成 G-Forge 规范到工具链 | 通过 Node.js API 程序化调用 |

### 1.4 产品边界

**G-Forge 是：**
- 一套通用规范文件集合（规则、协议、模板、Prompt）
- 一个 CLI 工具，将规范初始化、校验、同步到目标项目
- 一个预设系统，支持不同技术栈开箱即用

**G-Forge 不是：**
- 不是 UI 组件库
- 不是构建工具（不替代 Vite / Webpack / Turbo）
- 不是 CI/CD 系统
- 不是代码编辑器或 IDE 插件（未来可扩展）
- 不是 Linter（不替代 ESLint / Prettier，而是补充它们）
- 不是全栈框架（不包含路由、ORM、认证等运行时功能）
- 不是特定技术栈绑定（通过预设系统实现多栈支持）

---

## 第二部分：需求规格说明书

### 2.1 功能需求

#### FR-01：项目初始化（gforge init）

**优先级：** P0

**描述：** 扫描目标项目并输出符合规范的配置文件。

**输入：**
- 目标项目目录（默认 cwd）
- 预设名称（可选，如 `vite-react`）
- AI 助手（可选，如 `--agent claude,cursor`）
- 项目名称（可选，`--name`）
- 冲突策略（可选，`--conflict skip|overwrite|prompt`）
- 选项：`--scan`、`--dry-run`、`--force`、`--full`、`--yes`

**处理流程（6 阶段交互引导，ADR-007）：**
1. **Stage 1 项目检测**：扫描目标目录，判定 new / existing / reinit 模式
2. **Stage 2 AI 助手**：交互式多选或 `--agent` 指定，智能预选已有配置的 agent
3. **Stage 3 技术栈**：已有项目推荐预设 + 确认/修正；新建项目分组列表选择
4. **Stage 4 项目元信息**：收集项目名/描述/源码目录（从 package.json 推断默认值）
5. **Stage 5 输出配置**：输出层级 + 冲突策略 + pre-commit hook 开关
6. **Stage 6 确认预览**：汇总展示文件树 → 用户 confirm → 执行生成

**动态裁剪**：CLI flag 已指定的跳过对应交互；`--yes` 跳过全部交互；非 TTY 自动非交互。

**输出文件（按 agent 适配）：**
- `AGENTS.md`（通用，所有 agent 共用）
- Agent 入口文件（如 `CLAUDE.md`、`.cursorrules`、`.windsurfrules`）
- Agent 配置目录（如 `.claude/rules/`、`.cursor/rules/`）
- 高级功能文件（协议/钩子/技能/护栏/Prompt，仅 Claude Code）
- 预设特定规则（如 `react-specific.md`）

**支持的 AI 助手：**

| Agent | ID | 入口文件 | 配置目录 | 高级功能 |
|-------|----|----------|----------|----------|
| Claude Code | claude | `CLAUDE.md` | `.claude/` | 完整支持 |
| Cursor | cursor | `.cursorrules` | `.cursor/` | 仅规则 |
| Windsurf | windsurf | `.windsurfrules` | `.windsurf/` | 仅规则 |
| GitHub Copilot | copilot | `.github/copilot-instructions.md` | `.github/` | 仅规则 |
| Trae | trae | `.trae/rules/project.md` | `.trae/` | 仅规则 |
| Kimi | kimi | `AGENTS.md` | `.agents/` | 仅规则 |
| Codex | codex | `AGENTS.md` | `.codex/` | 仅规则 |
| 通用模式 | generic | 仅 `AGENTS.md` | — | — |

**验收标准：**
- [x] 扫描器能正确检测 TypeScript/JavaScript、React/Vue/Next.js/Angular 等技术栈
- [x] 模板变量 `{{variable}}` 被预设值正确替换
- [x] `--dry-run` 不写入任何文件
- [x] 已有文件默认跳过，`--force` 时覆盖
- [x] 无预设匹配时使用 `base` 预设兜底（`detectPreset()` 默认返回 'base'）
- [x] 支持 6 种 AI 助手，交互式多选 + `--agent` 非交互模式
- [x] 多 agent 同时选择时各自生成独立的入口文件和配置目录
- [x] 6 阶段交互引导（ADR-007），区分新建/已有/reinit 模式
- [x] 冲突策略三选（skip / overwrite / prompt 逐文件确认）
- [x] 确认预览：执行前展示文件树和配置摘要
- [x] `--yes` 跳过所有交互、`--name` 指定项目名、`--conflict` 指定冲突策略

#### FR-02：规范校验（gforge validate）

**优先级：** P0

**描述：** 检查目标项目源码是否符合 G-Forge 规则。

**内置校验规则：**

| 规则 ID | 名称 | 严重度 | 描述 |
|---------|------|--------|------|
| R001 | 严格类型 | error | 禁止 `any` 类型和 `@ts-ignore` |
| R002 | 命名导出 | warning | 禁止默认导出，使用命名导出 |
| R003 | 错误处理 | error | 禁止空 catch 块 |
| R005 | 文件长度 | error/warning | 超 300 行 error，超 200 行 warning |
| R006 | 函数复杂度 | warning | 单函数超 40 行 |
| R007 | 密钥安全 | error | 检测硬编码的 API 密钥、Token |
| A003 | API 层集中 | warning | 非 API 层文件直接调用 HTTP 客户端 |

**选项：**
- `--format text|json` — 输出格式
- `--severity error|warning` — 最低报告级别
- `--rule <id>` — 仅检查指定规则
- `--fix` — 自动修复可修复规则（R001、R002、R003）

**排除规则：**
- 测试文件（`.test.`、`.spec.`）不参与校验
- 测试 fixtures（`__fixtures__/`）不参与校验
- 配置文件（`vitest.config.*`、`eslint.config.*` 等）不参与校验
- `node_modules`、`dist`、`.git`、`coverage` 等目录跳过

**验收标准：**
- [x] 7 条内置规则全部实现并通过测试
- [x] 支持按规则 ID 和严重度过滤
- [x] JSON 输出包含完整的违规列表和摘要
- [x] 校验器自身源码通过自检（无误报）
- [x] `--fix` 自动修复基础规则（R001、R002、R003）

#### FR-03：上下文同步（gforge context）

**优先级：** P1

**描述：** 分析项目结构变化，自动更新 CLAUDE.md 等上下文文件。

**子命令：**
- `sync` — 重新扫描项目并更新配置文件
- `check` — 检查现有配置是否与项目结构一致

**验收标准：**
- [x] `sync` 能检测到新增/删除的模块并更新对应章节
- [x] `check` 能报告过期的配置项
- [x] 不覆盖用户手动编辑的内容

#### FR-04：规范迁移（gforge migrate）

**优先级：** P1

**描述：** G-Forge 版本升级时，迁移目标项目的规范文件。

**验收标准：**
- [x] 支持版本间差量迁移（section-level 合并）
- [x] `--dry-run` 预览迁移方案
- [x] 无法自动迁移的项标记为 `manualRequired`

#### FR-06：项目索引（gforge index）

**优先级：** P0（v1.3）

**描述：** 扫描目标项目源码，生成 AI 优先阅读的三个索引文件，降低 AI 改动前的广度扫描 token 开销。

**产出：**
- `docs/PROJECT_MAP.md` — 模块清单 → 文件路径
- `docs/FEATURES.md` — 功能清单 → 入口文件
- `docs/ROUTES.md` — 路由表 → handler（支持 Next.js App/Pages Router、Nuxt、Express、React Router、Vue Router）

**选项：**
- `--watch` — 监听 `src/` 递归变化，500ms 防抖；内容未变化时跳过写入避免级联
- `--check` — 漂移检测：对比索引 vs 实际代码，发现 `added` / `removed` / `dangling` 项时 exit 1

**验收标准：**
- [x] 首次 `gforge index` 能为 g-forge 自身生成三份与实际代码一致的索引
- [x] `--watch` 启动即全量刷新，文件变化触发增量重建，Ctrl+C 优雅退出
- [x] `--check` 识别三类漂移并返回非零退出码
- [x] 协议硬化：feature / bugfix 协议阶段 1 显式要求读索引，禁止未读索引就整库扫描

#### FR-07：智能内容补全（init 时）

**优先级：** P0（v1.3）

**描述：** 从项目描述 + 技术栈推导 SPEC / ARCHITECTURE 的结构化内容，让 init 产出的规范贴合真实项目而非通用样板。

**双模式：**
- **规则版**（默认）：关键词匹配 + 预设片段库，无外部依赖
  - 识别 7 种应用类型、8 个领域规则、23 功能关键词
  - 预设 `fragments` 字段提供 architectureLayers / defaultModules / structureHint / extraNfr
- **LLM 增强版**（可选，`--llm`）：检测到 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 时启用
  - 仅覆盖白名单字段（projectPositioning / productBoundaries / moduleBreakdown）
  - 超时 / 网络错误 / 解析错误一律透明降级到规则版
  - 交互模式下 Stage 5 检测到 API key 才询问是否启用

**老项目自动分析（ADR-007 双模式）：**
- 从 `package.json.name/description` + `README.md` 首段提取 name/description
- 徽章剥离 + 280 字符截断 + 损坏 JSON 兜底
- Stage 4 提供"自动分析 vs 手动输入"二选一

**验收标准：**
- [x] 规则版补全 8 个模板变量（projectPositioning / coreValueTable / productBoundaries / initialFeatures / nfrHints / architectureOverview / moduleBreakdown / projectStructureHint）
- [x] LLM 增强层测试覆盖 no-key / provider 成功 / 超时 / 解析错误 / 非 2xx / 白名单过滤
- [x] `ProjectMeta.source` 追踪 manual / auto；auto 模式下保留 `autoSources` 证据
- [x] Stage 5 交互在有 API key 时询问启用 LLM，无 key 时打印降级提示

#### FR-08：Deep Agent 自主生成（init --deep-agent）

**优先级：** P1（v1.4）

**描述：** 引入 LangGraph.js + `deepagents`，让 CLI 具备自主规划 + 工具调用 + 多轮分析能力，生成贴合项目实际的完整规范套件（SPEC / ARCHITECTURE / ADR-001 / rules / protocols / 入口文件）。替代模板变量替换的"一刀切"产物，尤其面向老项目架构反演场景。

**三档分析深度：**
- `shallow`：读 index / package / README；≤15k token / ~20s；10 步；适合有完整索引的项目
- `medium`（默认）：加 list_dir / read_file；≤50k token / ~40s；25 步；一般老项目
- `deep`：加 grep + 全量反演；≤150k token / ~90s；60 步；架构反演

**工具白名单（ADR-010）：** readIndex、readPackageJson、readReadme、listDir、readFile、grep、readPresetKnowledge、ask_user（可选）。无 writeFile / exec / 任意网络请求；所有路径通过 `assertPathSafe` 校验；禁读 `.env*` / 私钥 / `node_modules` / `.git`。

**输出文件白名单（10 份）：** `AGENTS.md` / `CLAUDE.md` / `docs/SPEC.md` / `docs/ARCHITECTURE.md` / `docs/decisions/ADR-001-architecture-baseline.md` / `.claude/rules/{architecture,code-quality,safety}.md` / `.claude/protocols/feature.md` / `.claude/guardrails/boundary-rules.json`。越界输出自动丢弃。

**三级降级链：** `deep-agent → llm-enhance → template`。任一失败原因（`deps-missing` / `no-key` / `timeout` / `step-limit` / `token-limit` / `parse-error` / `network-error` / `unsupported`）都触发自动下沉，主流程永不崩溃。

**Human-in-the-loop：** askUser 工具可选启用，shallow 禁用 / medium 最多 2 次 / deep 最多 3 次；非交互模式静默禁用。

**可观测性：**
- 运行时写 `docs/.gforge/agent-trace-{ts}.jsonl`，每行一条 step；末尾 summary 记录步数 / 费用 / 降级原因
- Stage 6 预览展示预估 token / 费用 / 耗时（`preflight.ts::estimateRun`）+ 降级策略说明
- `onDeepAgentResult` 回调实时反馈成功草稿数、成本、trace 路径或降级原因

**验收标准：**
- [x] 三档 depth 工具集、步数、token、超时上限独立可配（`DEPTH_PROFILES`）
- [x] 所有 optional 依赖通过 `loadDeepAgentDeps` 懒加载，缺失不影响主流程
- [x] 10 份白名单文件路径校验；越界输出被 `extractDrafts` 过滤
- [x] `runDeepAgent` 失败路径全部返回 `{ status: 'fallback', reason, message, partialDrafts, cost }`
- [x] CLI `--deep-agent` / `--depth shallow|medium|deep` 非交互可用，无效 depth 友好报错
- [x] 交互 Stage 5 在无 API key / 无依赖时自动隐藏 deep-agent 选项
- [x] 交互模式支持选 Provider / Model / API Key（ADR-011）；CLI `--model` / `--provider` / `--api-key` 非交互覆盖，`--api-key` 触发 shell history 警告

#### FR-05：预设系统

**优先级：** P0

**描述：** 通过预设支持不同技术栈开箱即用。

**预设结构：**
```
src/presets/<name>/
├── preset.json       # 元数据（名称、描述、变量、命令、代码风格）
├── rules/            # 技术栈特定规则
└── skills/           # 技术栈特定技能（可选）
```

**预设规划：**

| 预设名 | 技术栈 | 优先级 | 状态 |
|--------|--------|--------|------|
| nextjs | Next.js 15 + App Router | P0 | 已完成 |
| nuxt | Nuxt 3 + Vue 3 全栈 | P0 | 已完成 |
| nestjs | NestJS 10+ 后端服务 | P0 | 已完成 |
| vite-vue | Vue 3 + Vite 6 | P0 | 已完成 |
| vite-react | React 19 + Vite 6 | P0 | 已完成 |
| electron | Electron 桌面应用 | P0 | 已完成 |
| tauri | Tauri 2 桌面应用 | P1 | 已完成 |
| react-native | React Native + Expo | P1 | 已完成 |
| miniprogram | 微信小程序 | P1 | 已完成 |
| fastapi | Python FastAPI 后端 | P2 | 已完成 |
| express | Express / Hono / Fastify | P2 | 已完成 |
| monorepo | Turborepo / Nx Monorepo | P2 | 已完成 |
| uniapp | uni-app + Vue 3 跨端 | P3 | 已完成 |
| flutter | Dart + Flutter 跨端 | P3 | 已完成 |
| vanilla | 纯 HTML + JavaScript | P1 | 已完成 |
| base | 通用基础（技术栈无关） | P1 | 已完成 |

**验收标准：**
- [x] 预设加载器能正确读取 `preset.json`
- [x] 预设变量能覆盖模板中的 `{{variable}}` 占位符
- [x] 每个预设独立自包含，不依赖其他预设（4 套预设已完成）

### 2.2 非功能需求

#### NFR-01：性能

| 指标 | 目标值 |
|------|--------|
| `gforge init` 耗时 | 新项目 < 5 秒，已有项目 < 10 秒 |
| `gforge validate` 耗时 | 1000 文件以下 < 10 秒 |
| CLI 启动时间 | < 500ms |
| 内存占用 | < 256MB |

#### NFR-02：兼容性

| 维度 | 要求 |
|------|------|
| Node.js | >= 20.0.0 |
| 操作系统 | macOS、Linux、Windows |
| 包管理器 | pnpm、npm、yarn、bun 均可安装 |
| 技术栈 | 框架无关，通过预设适配 |

#### NFR-03：安全

- 禁止在代码或输出中包含硬编码密钥
- 不收集用户数据、不联网（纯本地工具）
- 不修改目标项目的 `package.json` 或安装依赖

#### NFR-04：可维护性

- 所有源码遵循 G-Forge 自身规范（吃自己的狗粮）
- 核心模块测试覆盖率 > 80%
- 代码质量通过 `gforge validate` 零违规

#### NFR-05：可扩展性

- 支持自定义规则（通过 API）
- 支持自定义预设（社区预设）
- 预设系统设计为可插拔

### 2.3 版本路线图

| 版本 | 里程碑 | 状态 |
|------|--------|------|
| v0.1 | CLI 基础 + 规范体系 + React 预设 + 校验引擎 | 已完成 |
| v0.2 | 上下文同步 + Vue 预设 + 自动修复 + 迁移命令 + 全部预设 | 已完成 |
| v0.3 | 自洽性补齐 + 工程成熟度（ESLint/测试/代码质量） | 已完成 |
| v1.0 | 16 个预设全部落地 + 多 AI 助手适配层 | 已完成 |
| v1.1 | Init 交互流程重设计（6 阶段 Wizard，ADR-007） | 已完成 |
| v1.2 | 工程生命周期补全（4 skill + 3 protocol） | 已完成 |
| v1.3 | 智能补全 + 项目索引（gforge index / LLM 增强层 / 老项目 auto-describe） | 已完成 |
| v1.4 | Deep Agent 驱动规范生成（LangGraph.js + deepagents，三档 depth，三级降级链，ADR-010） | 已完成 |
| v1.4.1 | Provider / Model / API Key 交互选择（ADR-011） | 已完成 |
| v2.0 | 生产就绪，完整文档、示例项目、自定义规则 API | 计划中 |

### 2.4 成功指标

| 指标 | 目标 |
|------|------|
| 初始化耗时 | 新项目 < 5 秒 |
| AI 代码合规率 | 使用 G-Forge 后架构违规降低 80% |
| 采纳成本 | 第 1 天即可体验价值（仅需 `gforge init`） |
| 技术栈覆盖 | v1.0 支持 React、Vue、Node.js 三大预设 |
| 自检通过率 | G-Forge 自身源码零违规 |

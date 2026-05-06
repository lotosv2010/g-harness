# 架构白皮书

> 定义 G-Harness 框架的技术架构、模块划分与部署方案。
> AI 在做任何架构决策前必须参考本文件。

---

## 1. 架构总览

### 1.1 五层 Harness 架构

G-Harness 通过五层结构将规范应用到目标项目：

```
┌──────────────────────────────────────────┐
│            应用层 Application             │  ← 用户的项目源码
├──────────────────────────────────────────┤
│           工作流层 Workflow               │  ← 协议、技能、钩子
├──────────────────────────────────────────┤
│            约定层 Convention              │  ← 模板、Prompt、命名规范
├──────────────────────────────────────────┤
│            约束层 Constraint              │  ← 规则引擎、护栏、校验器
├──────────────────────────────────────────┤
│           上下文层 Context                │  ← CLAUDE.md、AGENTS.md、ADR
└──────────────────────────────────────────┘
```

### 1.2 五层 → 目录/文件映射

五层是**抽象视角**，CLI 引擎（`src/core/*`）是**跨层执行基座**，不归属任一层。

| 层 | 职责 | 对应文件/目录 |
|----|------|---------------|
| **应用层 Application** | 用户的项目源码 | 目标项目的 `src/`（g-harness 自身不含；由 CLI 生成的规范注入目标项目） |
| **工作流层 Workflow** | 标准化任务执行流程 | `.claude/protocols/{feature,bugfix,refactor,review,testing,migration,incident,hotfix,rollback,api-design,deployment,requirements}.md`、`.claude/skills/{analyze,debt,feat,pr,release,scaffold,security,test-gen}/`、`.claude/hooks/{pre-task,post-task,pre-commit,pre-merge,pre-release,post-deploy,on-error}.md` + 运行时脚本 `{pre-tool-check,post-write-validate,on-stop-summary}.mjs` |
| **约定层 Convention** | 可复用模板与 Prompt | `src/templates/{shared,claude,cursor,copilot,windsurf,trae,kimi,codex}/`、`src/presets/`、`.claude/prompts/{bug-report,code-review,feature-dev,refactor}.md`、`tools/prompts/` |
| **约束层 Constraint** | 硬性规则与自动校验 | `.claude/rules/{architecture,code-quality,safety,git,dependency}.md`、`.claude/guardrails/{boundary-check,pre-commit,secret-scan,file-size,coverage-gate}.md`、`src/core/validator/` |
| **上下文层 Context** | 项目元信息与决策记录 | `CLAUDE.md`、`AGENTS.md`、`docs/{SPEC,ARCHITECTURE,DESIGN,API,DATA_MODEL,SDLC-MAP}.md`、`docs/decisions/`、`docs/team/`、`docs/tasks/{BOARD,CURRENT}.md`、`docs/runbooks/{deployment,rollback,incident-response}.md` |

**CLI 引擎（跨层基座）：** `src/core/{commands,scanner,generator,indexer,agents,analyzer,migrator,context,validator}` — 负责把上述五层的规范读取、生成、校验、迁移到目标项目。

**分发路径说明：** 根目录 `.claude/` 是 g-harness **自身开发**使用的具体规则；`src/templates/shared/.ai/` 是**面向目标项目**的通用版本（带 `{{variable}}` 占位符），生成时由 `AgentAdapter` 映射为目标 agent 的 `configDir`（Claude → `.claude/`，Cursor → `.cursor/rules/` 等）。

### 1.3 项目结构

```
g-harness/
├── AGENTS.md / CLAUDE.md / README.md
├── docs/                      # 约束与规格层
├── .claude/                   # Claude 行为控制层
├── tools/                     # 工具层（prompts / scripts）
├── tests/                     # 全局测试
│
└── src/                       # 全部业务代码
    ├── core/                  # CLI 引擎
    │   ├── commands/          # init / validate / context / index / migrate / check
    │   │   ├── init.ts        # 薄入口（flag 解析 → 派发）
    │   │   ├── init-shared.ts # Q1 路由 + 非交互回退 + Stage 6 预览
    │   │   ├── init-new.ts    # 新建项目 9 问线性向导
    │   │   ├── init-existing.ts # 已有项目 6 阶段 re-author 向导
    │   │   └── init-types.ts  # WizardContext / WizardResult / GenerateMode
    │   ├── agents/            # agent-registry + agent-adapter + deep-agent/
    │   ├── scanner/           # 项目扫描与技术栈检测
    │   ├── indexer/           # 项目索引（PROJECT_MAP / FEATURES / ROUTES）
    │   ├── analyzer/          # 12 键变量补全 + 窄 LLM 增强
    │   ├── generator/         # 策略模式生成器
    │   │   ├── file-generator.ts  # 薄派发器
    │   │   ├── file-collector.ts  # 模板树遍历
    │   │   ├── variables-builder.ts
    │   │   └── strategies/    # template / llm-enhance / deep-agent
    │   ├── validator/         # 规范校验引擎
    │   └── migrator/          # 规范版本迁移
    ├── presets/               # 16 个技术栈预设（Schema v2）
    └── templates/             # 可分发内容
        ├── shared/            # 所有 agent 共用的模板
        │   ├── AGENTS.template.md
        │   ├── .ai/rules|protocols|guardrails/
        │   └── docs/{SPEC,ARCHITECTURE,decisions,tasks}
        ├── claude/            # Claude Code 专属（CLAUDE.md + .claude/）
        ├── cursor/            # .cursorrules + .cursor/
        ├── copilot/           # .github/copilot-instructions.md
        ├── windsurf/          # .windsurfrules + .windsurf/
        ├── trae/              # .trae/rules/
        ├── kimi/              # .agents/
        └── codex/             # .codex/
```

## 2. 技术栈（g-harness 自身）

| 层级 | 技术选型 | 理由 |
|------|----------|------|
| 语言 | TypeScript 5.x（strict） | 类型安全 + AI 友好 |
| 运行时 | Node.js 20+ | LTS 稳定版 |
| 包管理 | pnpm | 快速、严格 |
| 测试 | Vitest | 速度快、TypeScript 原生支持 |
| Lint | ESLint 9 (flat config) | 新标准，可扩展 |
| 格式化 | Prettier | 团队一致性 |
| CLI 框架 | commander | 轻量、TypeScript 友好 |
| 模板引擎 | 自研变量替换 | `{{variable}}` 简单替换，避免重依赖 |
| YAML 解析 | yaml (npm) | YAML 1.2 完整支持 |

## 3. 模块划分

### 3.1 src/core/scanner — 项目扫描器

职责：检测目标项目的技术栈、目录结构、现有配置。

```
scanner/
├── index.ts               # 公共 API
└── project-scanner.ts     # 扫描实现
```

输入：目标项目根目录路径
输出：`ScanResult`（技术栈、项目结构、现有配置）

### 3.2 src/core/generator — 文件生成器（策略模式，v0.2+）

职责：按 `mode` 选择生成策略 → 产出 drafts → 冲突解决 → 写盘。

```
generator/
├── index.ts                      # 公共 API
├── file-generator.ts             # 薄派发器（pickStrategy → produce → write）
├── file-collector.ts             # 遍历 src/templates/shared/ + per-agent 模板
├── variables-builder.ts          # 包装 completeContent()
└── strategies/
    ├── strategy-types.ts         # GenerationStrategy / GenerationContext / StrategyResult
    ├── template-strategy.ts      # 纯模板渲染 + AgentAdapter 映射 .ai → agent configDir
    ├── llm-enhance-strategy.ts   # 组合 enhanceWithLlm + TemplateStrategy
    └── deep-agent-strategy.ts    # 组合 runDeepAgent + 三级降级链
```

**三级降级链（ADR 延续）：** `deep-agent → llm-enhance → template`。`DeepAgentStrategy` 失败时调用 `LlmEnhanceStrategy`，后者再失败调用 `TemplateStrategy`。每级降级写 trace + CLI 黄字提示 `degradeReason`。

输入：`GenerateOptions { mode, agents, preset, meta, scanResult, depth?, provider?, model?, apiKey? }`
输出：`GenerateResult { usedStrategy, degradedFrom?, degradeReason?, drafts, written, variables }`

### 3.3 src/core/validator — 规范校验器

职责：检查目标项目是否符合规范规则。

```
validator/
├── index.ts               # 公共 API
└── rule-validator.ts      # 校验实现
```

输入：目标项目根目录路径
输出：`ValidationResult`（通过与否、违规列表、警告列表）

### 3.4 src/core/migrator — 配置迁移器

职责：规范版本升级时，迁移目标项目的配置文件。

```
migrator/
├── index.ts               # 公共 API
└── config-migrator.ts     # 迁移实现
```

输入：目标目录、源版本、目标版本
输出：`MigrateResult`（已迁移文件、需手动处理的文件）

### 3.5 src/presets/ — 技术栈预设

每个预设补充通用规范，提供技术栈特定的规则、技能和模板。

```
src/presets/<name>/
├── preset.json            # 预设元数据（技术栈、变量值、命令）
├── rules/                 # 栈特定规则
└── skills/                # 栈特定技能
```

### 3.6 src/core/analyzer — 内容分析与补全（v0.2 12 键 schema）

职责：从项目元信息 + 技术栈 + 预设 → 产出 12 键 `TemplateVariables`，为生成器提供模板变量值。

```
analyzer/
├── index.ts                  # 公共 API barrel
├── description-analyzer.ts   # 关键词 → 应用类型 / 领域 / DescriptionAnalysis
├── content-completer.ts      # completeContent()：核心入口，产出 12 键变量
├── auto-describe.ts          # package.json + README → ProjectMeta 自动推导
└── llm-completer.ts          # 窄 LLM 增强：仅改写 architecture_overview + module_breakdown
```

**12 键 TemplateVariables schema：**
- Identity（3）：`project_name` / `project_description` / `tech_stack`
- Architecture（3）：`architecture_overview` / `module_breakdown` / `project_structure`
- SPEC（2）：`core_value` / `initial_features`
- Conventions（3）：`code_standards` / `test_standards` / `commands`
- 预设目录变量（可选）：`shared_dir` / `feature_dir` 等由 `preset.variables` 注入

LLM 增强层严格白名单：仅 `architecture_overview` 和 `module_breakdown` 可被改写；超时 / 网络错误 / 解析错误 / 非 2xx 一律回落规则版。

### 3.7 src/core/indexer — 项目索引器（v1.3+）

职责：扫描源码生成 AI 优先阅读的三个索引文件，避免广度扫描 token 浪费。

```
indexer/
├── index.ts                  # 公共 API（buildProjectIndex）
├── types.ts                  # ProjectIndex / ModuleEntry / RouteEntry / FeatureEntry
├── route-parser.ts           # 路由解析（next-app/next-pages/nuxt/react-router/vue-router/express）
├── module-extractor.ts       # 模块提取（src/ 扫描 + index.ts exports 解析）
├── feature-mapper.ts         # 模块+路由 → 功能映射
├── index-writer.ts           # 渲染 PROJECT_MAP / FEATURES / ROUTES Markdown
└── index-drift.ts            # 漂移检测（added / removed / dangling）
```

输入：`rootDir` + `ScanResult`
输出：`docs/PROJECT_MAP.md`、`docs/FEATURES.md`、`docs/ROUTES.md`

命令：`g-harness index` / `g-harness index --watch` / `g-harness index --check`

### 3.8 src/templates/ — 可分发内容（v0.2 per-agent 目录重构）

所有输出给目标项目的内容，按 agent 分目录。`shared/` 存放所有 agent 共用的规范；`claude/`、`cursor/`、`copilot/`、`windsurf/`、`trae/`、`kimi/`、`codex/` 各自存放该 agent 的入口文件与配置目录。

```
src/templates/
├── shared/                    # 所有 agent 共用
│   ├── AGENTS.template.md     # → 目标项目 AGENTS.md
│   ├── .ai/
│   │   ├── rules/             # architecture / code-quality / safety / git / dependency
│   │   ├── protocols/         # feature / bugfix / refactor / review / testing / migration / incident / hotfix / rollback
│   │   └── guardrails/        # boundary-rules.json / pre-commit / secret-scan / file-size / coverage-gate
│   └── docs/
│       ├── SPEC.template.md
│       ├── ARCHITECTURE.template.md
│       ├── decisions/ADR-001-architecture-baseline.template.md
│       └── tasks/{BOARD,CURRENT}.template.md
├── claude/                    # Claude Code 专属
│   ├── CLAUDE.template.md
│   └── .claude/               # 映射自 shared/.ai/
├── cursor/                    # .cursorrules + .cursor/rules/
├── copilot/                   # .github/copilot-instructions.md
├── windsurf/                  # .windsurfrules + .windsurf/
├── trae/                      # .trae/rules/project.md
├── kimi/                      # .agents/
└── codex/                     # .codex/
```

**AgentAdapter 映射：** `file-collector` 遍历 `shared/` 后，为每个所选 agent 调用 `agentAdapter.adaptFiles()`，把通用 `.ai/` 路径映射为该 agent 的 `configDir`（Claude → `.claude/`，Cursor → `.cursor/rules/` 等），并叠加 agent 特定入口模板。

### 3.9 src/core/agents/deep-agent — Deep Agent 子系统（v0.2 动态白名单）

基于 LangGraph.js + `deepagents` 的自主规范生成子系统。

```
src/core/agents/deep-agent/
├── index.ts                # runDeepAgent：永不抛错，失败一律转降级
├── agent-factory.ts        # buildDeepAgent：组装 tools + ChatModel + 2 个 subagents
├── fallback.ts             # classifyError + buildFallback（供 DeepAgentStrategy 消费）
├── preflight.ts            # estimate(depth, model)：token / 费用 / 耗时预估
├── config.ts               # DEPTH_PROFILES + MODEL_PRICING + DEFAULT_MODELS + PRICING_AS_OF
├── types.ts                # DeepAgentOptions / DeepAgentResult / DraftFile / CostReport
├── lazy-import.ts          # optional 依赖动态加载（缺失即返回 { ok:false, missing }）
├── guards/
│   ├── cost-tracker.ts     # 聚合 usage_metadata + 价目换算
│   ├── step-limiter.ts     # 循环步数硬上限
│   └── timeout.ts          # AbortController 封装，总超时 + parent signal
├── prompts/
│   ├── system-prompt.ts    # 主 Agent 系统提示 + 动态白名单清单（computeOutputWhitelist）
│   └── subagent-prompts.ts # 2 位专职作家：spec-writer / rules-writer
├── tools/                  # 7 个只读工具 + ask-user（可选）+ security.ts 路径卫士
├── trace/
│   └── trace-writer.ts     # JSONL 步事件 + 末尾 summary
└── knowledge/              # 6 份预设知识库（nextjs/nestjs/vite-react/nuxt/electron/fastapi）
```

**动态 6 文件白名单（v0.2 关键变化）：** 不再硬编码 10 份，而是从所选 `agents[]` 运行时构建：

```
AGENTS.md
<agent.entryFile>            # 多 agent 多入口
docs/SPEC.md
docs/ARCHITECTURE.md
<agent.configDir>/rules/architecture.md
<agent.configDir>/rules/code-quality.md
```

`protocols/*.md` / `guardrails/*.json` / `hooks/*.mjs` / `skills/**` / `ADR-*.md` 归模板路径（schema 严苛、LLM 易失败）。系统提示词同步动态注入白名单清单。

**关键约束：**
- 全量 optional：`deepagents` / `@langchain/*` / `zod` 缺失均不反杀主流程
- 路径安全：所有工具输入路径必须通过 `assertPathSafe`，黑名单 `.env*` / 私钥 / `.git` / `node_modules` / `dist` / `coverage`
- 输出越界：`extractVirtualFiles` + `filterWhitelist` 过滤
- 三级降级由 `DeepAgentStrategy` 编排（外部 generator 层），主流程永远能完成 `g-harness init`

## 4. 数据流

```
g-harness init [dir]
         │
         ▼
   init.ts 解析 flag → normalizeMode（处理 --llm / --deep-agent 弃用警告）
         │
         ▼
   init-shared.buildWizardContext（scanner + detection + isInteractive）
         │
         ▼
   init-shared.routeProjectMode → { new | existing | reinit }
         │
         ├─ new       → init-new.runNewProjectWizard   （9 问线性流）
         └─ existing  → init-existing.runExistingProjectWizard（6 阶段 re-author）
         │
         ▼
   previewAndConfirm（Stage 6 预览 + p.confirm）
         │
         ▼
   FileGenerator.generate(opts)
         │
         ▼
   pickStrategy(mode):
   ├─ template       → TemplateStrategy
   ├─ llm-enhance    → LlmEnhanceStrategy（enhanceWithLlm + TemplateStrategy）
   └─ deep-agent     → DeepAgentStrategy（runDeepAgent + 三级降级）
         │
         ▼
   strategy.produce(ctx) → StrategyResult { drafts, usedStrategy, degradedFrom?, degradeReason? }
         │
         ▼
   冲突解决（skip / overwrite / prompt）→ 写盘
         │
         ▼
   输出文件：AGENTS.md / <agent.entryFile> / <agent.configDir>/rules/* / docs/SPEC.md / docs/ARCHITECTURE.md / ...
```

## 5. 部署架构

### 5.1 CLI 工具（主要分发方式）

```
npm publish → npmjs.com → npx g-harness init
```

CLI 是纯本地工具，不需要服务端。

### 5.2 文档站（可选，未来）

```
构建 → 静态文件 → Vercel / Cloudflare Pages
```

## 6. 关键架构决策

v0.2.0 全栈重写时清理了 v0.1.x 叠加的 11 份 legacy ADR。以下为 v0.2.0 继承的核心设计决策摘要（未来新增决策写入 `docs/decisions/ADR-XXX-*.md`）：

| 决策主题 | 内容 | 理由 |
|----------|------|------|
| 单包结构 | 业务代码统一收纳于 `src/core`，规范内容与代码严格隔离（A001） | 框架定位是规范工具，根目录保持 AI 指导结构 |
| Markdown 规范格式 | 所有规则 / 协议 / 文档统一 Markdown | AI 原生友好，零解析成本，人类可读 |
| 自研变量替换 | `{{variable}}` 简单替换，不引入 Handlebars | 9 行实现，零依赖，调试简单 |
| 策略模式生成器 | `TemplateStrategy` / `LlmEnhanceStrategy` / `DeepAgentStrategy` | 职责隔离，降级链在策略内部组合，`file-generator` 退化为薄派发 |
| 12 键模板变量 | identity / architecture / SPEC / conventions 四组 12 键 | 去除 v0.1 遗留的重复字段（`module_map` vs `module_breakdown`）；预设目录变量由 `preset.variables` 注入 |
| Per-agent 模板目录 | `shared/` + `claude/`/`cursor/`/`copilot/`/`windsurf/`/`trae/`/`kimi/`/`codex/` | 入口文件与 configDir 路径差异解耦，AgentAdapter 负责映射 |
| Preset Schema v2 | `techStack` / `detect` / `variables` / `commands` / `architecture` / `modules` / `rules` / `nfr` / `knowledgeSlug` | 移除 v0.1 嵌套 `fragments.*`，结构扁平清晰 |
| 新建 9 问线性流 | `agents → name → srcDir → desc → preset → techStack → enableLlm → depth → provider → model → apiKey` | 对齐 README 示例；Q7=Yes 默认 Deep Agent，depth 默认 medium |
| 已有项目 6 阶段 re-author | `agents → autoDescribe 复核 → preset → conflict → LLM → 确认` | reinit 默认 conflict=skip，保护现有文件 |
| Deep Agent 动态 6 文件白名单 | 从所选 `agents[]` 运行时构建，协议/钩子/技能归模板 | schema 严苛文件让 LLM 易失败，只让 LLM 写文字密集的 6 份 |
| 三级降级链 | `deep-agent → llm-enhance → template` | 每级降级写 trace + CLI 黄字提示，主流程永不崩溃 |
| 配置优先级链 | `CLI flag > 交互输入 > env > DEFAULT_MODELS[depth]` | `--api-key` 附 shell-history 警告；非交互 + 无 API key 时直接失败（不静默降级） |
| optional 依赖 | `deepagents` / `@langchain/*` / `zod` 全部 optional | 缺失即触发 `deps-missing` 降级，核心 CLI 无 LangChain 依赖 |

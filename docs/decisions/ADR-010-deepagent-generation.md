---
id: ADR-010
status: accepted
date: 2026-04-25
superseded_by: null
---

# Deep Agent 驱动的规范文件自主生成

## 背景

v1.3 已实现三层内容生成能力：

1. **模板 + 变量替换**（默认）：静态模板 + `{{var}}` 填充
2. **规则版内容补全**（`content-completer.ts`）：从描述/技术栈推导 8 个模板变量
3. **窄 LLM 增强**（ADR-009）：白名单 3 个叙述字段由 LLM 改写，失败透明降级

痛点：
- 模板是"一刀切"的产物，无法根据**特定项目上下文**深度调整（如老项目真实的模块边界、已有的架构分层）
- 规则版补全基于关键词启发式，覆盖场景有限
- 窄 LLM 只改 3 个字段，剩余结构化内容（NFR、模块清单、架构分层、rules、protocols、ADR）仍是模板死套
- 老项目场景下，用户期望"AI 读懂我的代码"再生成规范，而不是"填空式"的通用规范

期望：引入 **LangChain `deepagents` 模式**，让 CLI 具备自主规划 + 工具调用 + 多轮分析的能力，生成**贴合项目实际的完整规范套件**。

## 决策

**采用 LangGraph.js + `deepagents` 库构建"规范生成 Deep Agent"**，作为现有生成管线的**可选顶层路径**，与模板路径**并行**保留。

### 核心定位（对应用户 Q1=A）

Deep Agent 路径**全量取代模板变量替换**：对每个输出文件，Agent 自主产出完整 Markdown 内容；模板仅作为"基线参考"和"结构提示"喂给 Agent，不做最终变量替换。

### 三档分析深度（对应用户 Q2）

用户在 Stage 5 选择生成模式时同时选择深度：

| 深度 | 工具集 | 目标 token | 适用场景 |
|------|--------|-----------|----------|
| **浅层** | `readIndex`（PROJECT_MAP/FEATURES/ROUTES）+ `readPackageJson` + `readReadme` | ≤ 15k | 新项目 / 有完整索引的老项目 |
| **中层**（推荐） | 浅层 + `readFile`（白名单入口）+ `listDir`（src/） | ≤ 50k | 一般老项目，需 Agent 抽样理解 |
| **深层** | 中层 + `grep` + 无限制 `readFile` + 子 agent 派发 | ≤ 150k | 架构反演、大型遗留项目 |

### 技术栈（对应用户 Q3）

- `deepagents` (npm) — 提供 `createDeepAgent`、内置 `write_todos`、虚拟文件系统（`ls`/`read_file`/`write_file`/`edit_file`）、subagent 派发
- `@langchain/langgraph` — 状态图运行时（`deepagents` 基于此）
- `@langchain/anthropic` / `@langchain/openai` — 模型客户端
- `zod` — 工具 schema
- **LangChain.js，不开 Python 子进程**（保持单一运行时）

### 工具白名单（对应用户 Q4）

| 工具 | 能力 | 安全约束 |
|------|------|----------|
| `readIndex` | 读 `docs/PROJECT_MAP.md` / `FEATURES.md` / `ROUTES.md` | 只读 |
| `readPackageJson` | 读根 `package.json` | 只读 |
| `readReadme` | 读根 `README.md` | 只读，250 行上限 |
| `listDir` | 列目录 | 过滤 `node_modules`/`.git`/`dist`/`.env*` |
| `readFile` | 读单文件 | 路径必须在目标目录内；禁止 `.env*`/私钥扩展；单文件 500 行上限 |
| `grep` | ripgrep 式搜索 | 同 readFile 过滤；结果条数上限 200 |
| `readPresetFragment` | 读当前预设的 `fragments` 字段 | 只读内置 |
| `recordDraft` | 把草稿写入 Agent 虚拟 FS（非磁盘） | 通过 `deepagents` 内置 |
| `askUser`（可选） | Human-in-the-loop 提问 | 仅中/深层开启，问题数上限 3 |

**黑名单**：无 `writeFile`（磁盘落盘由生成器统一）、无 `exec` / `shell`、无网络请求（除 LLM provider）。所有路径通过 `path.resolve` 后校验必须以 `targetDir` 开头。

### CLI / UX（对应用户 Q5）

**两种触发方式并存：**

1. **CLI flag**：`g-harness init --deep-agent [--depth shallow|medium|deep]`（默认 medium）
2. **交互式**：Stage 5 新增"生成模式"选择：
   - `template`（默认）：模板 + 规则版补全
   - `llm-enhance`：模板 + 窄 LLM 增强（v1.3 现状）
   - `deep-agent`：Deep Agent 自主生成 + 深度选择子菜单

Stage 6 预览额外展示：预计 token / 预估费用（基于模型价目）/ 预计耗时 / Agent 计划的工具调用次数上限。

### 成本与可观测性（对应用户 Q6）

- **Token 统计**：聚合每一步 `AIMessage.usage_metadata`，CLI 结尾显示"实际 token / 预估 token / 费用"
- **执行前确认**：Stage 6 展示预估后用户必须 confirm 才开始（`--yes` 跳过）
- **硬上限**：
  - 循环步数：浅 ≤ 10 / 中 ≤ 25 / 深 ≤ 60
  - 总 token：超阈值自动停止并降级到模板路径
  - 单次请求超时：60s；总执行超时：浅 2min / 中 5min / 深 10min
- **Trace 落盘**：`docs/.g-harness/agent-trace-{timestamp}.jsonl`，每行一条 step（thought/tool_call/tool_result/message），便于 debug
- **流式输出**：CLI 实时打印 Agent 思考 + 工具调用（`p.log.step`），失败时保留部分产出

### 预设新职责（对应用户 Q7）

**Agent 自己根据 `preset.name` 在内置 knowledge base 中查找领域知识**，预设不新增 prompt 片段。

Knowledge base 内置在 `src/core/agents/deep-agent/knowledge/` 目录，按预设名索引（如 `nextjs.md`、`nestjs.md`），包含该技术栈的最佳实践、常见分层、常见陷阱。Agent 通过 `readPresetKnowledge(presetName)` 工具读取。

### 白名单字段扩展（继承 ADR-009 精神）

Deep Agent 可产出的文件：

| 输出类 | 白名单 | 说明 |
|--------|--------|------|
| **完整叙述文档** | `AGENTS.md`、`CLAUDE.md`、`docs/SPEC.md`、`docs/ARCHITECTURE.md`、`docs/decisions/ADR-*.md` | Agent 完全接管 |
| **规则文件** | `.claude/rules/*.md`、各 agent 对应目录的 `rules/*.md` | Agent 可新增项目特定规则 |
| **协议文件** | `.claude/protocols/*.md` | Agent 可改写 checklist 细节 |
| **护栏配置** | `.claude/guardrails/boundary-rules.json` | Agent 可产出，但**必须 schema 校验**后才落盘 |
| **禁止 Agent 生成** | `.claude/hooks/*.mjs`、`.claude/skills/**` | 保持模板，安全考虑 |

### 降级策略（保留 ADR-009 不变）

Deep Agent 路径任何失败都透明降级：
- LLM provider 不可用 → 降级到 `llm-enhance` 模式
- `llm-enhance` 也失败 → 降级到 `template` 模式
- 降级时 CLI 显式打印降级原因，保留 partial 产出到 `docs/.g-harness/agent-drafts/`

## 备选方案

### 方案 A：自研 agentic loop

不引入 LangChain，手写 think-act-observe 循环 + tool calling。

- 优点：零额外依赖、完全可控
- 缺点：重复造轮子；状态管理、checkpoint、stream、subagent 派发都要自己实现；维护成本高；与生态脱节

### 方案 B：扩展现有 `llm-completer.ts`

把 ADR-009 的白名单扩大到 30+ 字段，用 function calling 让 LLM 分阶段填充。

- 优点：改动小，沿用现有设计
- 缺点：无法 agentic 地读代码 → 多轮推理；老项目深度分析能力缺失；function call 单次响应难以跨文件关联推理

### 方案 C：LangChain Agents（非 LangGraph）

用 `langchain/agents` 的 `createOpenAIToolsAgent` + `AgentExecutor`。

- 优点：API 稳定
- 缺点：无子 agent 派发、无计划工具、无虚拟 FS；LangChain 官方已推荐新项目用 LangGraph

### 方案 D：本 ADR 决策 — LangGraph + `deepagents`

**选定**。

## 影响

### 正面
- 老项目接入体验跃升：Agent 读完代码再生成规范，贴合实际
- 新项目也能获益：Agent 根据描述展开多轮推理，比规则版更细致
- 规范文件从"模板填空"变为"项目量体裁衣"
- Trace 可观测性 + 成本透明，风险可控
- 与 ADR-008 项目索引协同：Agent 优先读索引，极大降低 token

### 负面 / 权衡
- **新增依赖**：`deepagents` + `@langchain/langgraph` + `@langchain/anthropic` + `@langchain/openai` + `zod`，install 体积 +30~60MB
  - **缓解**：通过 `optionalDependencies` + 运行时 lazy import，不启用 deep-agent 时零加载
- **成本**：每次 deep-agent init 消耗 $0.05~$1（视深度和项目规模），需在 UX 中透明告知
- **ESM/CJS**：LangChain 生态是 ESM，项目已经是 ESM，兼容
- **token 不可预测**：Agent 行为受模型随机性影响，预估值仅供参考；硬上限兜底
- **Knowledge base 维护负担**：16 个预设的 knowledge 文件需逐步填充，初版仅提供核心 6 个（nextjs/nestjs/vite-react/nuxt/electron/fastapi）

### 对现有代码影响
- `src/core/generator/file-generator.ts`：增加 `mode: 'template' | 'llm-enhance' | 'deep-agent'` 参数；deep-agent 模式下绕过变量替换，改用 agent 产出
- `src/core/commands/init.ts` / `init-interactive.ts`：Stage 5 新增生成模式选择
- `src/core/analyzer/llm-completer.ts`：保持不变，作为 deep-agent 降级路径

## AI 指引

### 目录结构

```
src/core/agents/deep-agent/
├── index.ts                    # 对外 API：runDeepAgent(options)
├── types.ts                    # DeepAgentOptions / DeepAgentResult / Depth
├── agent-factory.ts            # createDeepAgent 包装 + 配置
├── tools/
│   ├── index.ts                # 工具集导出
│   ├── read-index.ts
│   ├── read-package-json.ts
│   ├── read-readme.ts
│   ├── list-dir.ts
│   ├── read-file.ts            # 路径白名单校验
│   ├── grep.ts
│   ├── read-preset-knowledge.ts
│   └── security.ts             # 统一路径校验 / 黑名单过滤
├── knowledge/                  # 预设知识库
│   ├── nextjs.md
│   ├── nestjs.md
│   ├── vite-react.md
│   ├── nuxt.md
│   ├── electron.md
│   └── fastapi.md
├── prompts/
│   ├── system-prompt.ts        # 主 Agent 系统提示
│   └── subagent-prompts.ts     # 子 agent 提示（spec-writer/architecture-writer/rules-writer）
├── guards/
│   ├── cost-tracker.ts         # token/费用聚合
│   ├── step-limiter.ts         # 循环步数上限
│   └── timeout.ts              # AbortController 管理
├── trace/
│   └── trace-writer.ts         # 写 docs/.g-harness/agent-trace-*.jsonl
└── fallback.ts                 # 降级到 llm-enhance / template
```

### 执行流（高层）

1. **Pre-flight**（Agent 启动前）
   - 读 `package.json` / `README.md` / 索引文件，建立 baseline context
   - 生成"预估报告"（token/费用/耗时）
   - 用户 confirm（`--yes` 或 interactive confirm）

2. **Agent 运行**
   - 主 Agent 执行 `write_todos`：规划产出文件列表
   - 按优先级调度子 agent：
     - `spec-writer`：生成 SPEC.md
     - `architecture-writer`：生成 ARCHITECTURE.md
     - `rules-writer`：生成 rules/*.md + 项目特定 ADR
     - `entry-writer`：生成 AGENTS.md + CLAUDE.md 等入口文件
   - 每个子 agent 在虚拟 FS 中产出草稿
   - 主 Agent 校验 + 合并

3. **Post-process**
   - 从 Agent 虚拟 FS 提取所有草稿文件
   - 走 `FileGenerator.generate()` 的 conflict 策略 + 落盘管线（复用现有逻辑）
   - 写 trace 文件
   - 输出成本报告

### 安全与降级

- 所有 tool 入口统一走 `tools/security.ts` 的 `assertPathSafe(path, targetDir)`
- `tools/security.ts` 的路径黑名单：`.env*`、`*.pem`、`*.key`、`id_rsa*`、`.git/**`、`node_modules/**`、`dist/**`、`coverage/**`
- Agent 超限（步数/token/超时）→ 抛受检错误 → 降级到 `llm-enhance` → 再失败降级到 `template`
- 降级时在 Stage 6 UI 显式告知：`⚠ Deep Agent 超限，已降级到 llm-enhance 模式`

### 测试策略

- 单元测试：每个 tool 的路径校验（正例 + 反例 ≥ 3 个）
- 集成测试：mock LangChain runtime，验证状态机转换 / 降级路径 / 成本上限
- E2E（可选）：使用小模型（haiku / gpt-4o-mini）对 fixtures 目录跑一次真实 Agent，验证产物
- **不依赖真实 API key 的 CI**：所有测试用 `fetchImpl` 注入或 LangChain `FakeModel`

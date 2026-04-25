---
id: ADR-011
status: accepted
date: 2026-04-25
superseded_by: null
amended: 2026-04-25（按用户确认：新增 `--api-key` flag 并附 shell history 警告）
---

# LLM Provider / Model / API Key 交互选择（列表 + env + CLI）

## 背景

v1.4 完成 Deep Agent（ADR-010）与 v1.3 完成窄增强（ADR-009）后，实测发现：

1. `llm-completer.ts` 硬编码 `claude-haiku-4-5-20251001` / `gpt-4o-mini`，用户不能选模型
2. `runDeepAgent` 按 `DEFAULT_MODELS[depth][provider]` 自动映射（shallow/medium=haiku，deep=sonnet），用户无选择权
3. `resolveProvider()` 只读 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` 环境变量，未设时直接降级；交互模式无 `p.select` 让用户选 provider，也无 `p.password` 让用户当场输入 key
4. CLI 无 `--model` flag，CI / 脚本化无法精准指定模型

用户反馈："使用大模型增强是怎么没有让我选择大模型和输入对应的 key" —— 这是真实 UX 缺陷。

## 决策

在 `llm-enhance` 和 `deep-agent` 两条路径上补齐 **Provider → Model → API Key** 三步选择，三点约束由用户确认：

1. **Model 用列表选择**：在 `MODEL_PRICING` 表内展示四个已知选项（+ 每档推荐标记），不开放自定义串输入
2. **继续支持 env**：env 已设时自动复用并跳过 key 输入步骤；env 未设时 `p.password()` 交互输入
3. **新增 `--model` 与 `--api-key` CLI flag**：非交互模式可显式指定；`--api-key` 会进 shell history，运行时在 CLI 打印黄色警告提示改用 env（按用户确认采纳）

优先级链（从高到低）：**CLI flag > 交互输入 > env > DEFAULT_MODELS[depth]**

## 备选方案

### 方案 A：列表 + env + `--model`（采纳）

- 优点：
  - UX 清晰：选 provider → 选 model → 有 key 自动通过 / 无 key 弹输入
  - 预估准确：所有模型都在 `MODEL_PRICING` 表内，`calcCost` 零改动
  - 非交互可控：`--model` 覆盖默认映射；env 负责 key（安全）
  - 兼容现有代码：`DEFAULT_MODELS` 作为"未指定时的 fallback"保留
- 缺点：
  - 新模型需要同步维护 `MODEL_PRICING` 表
  - 用户不能用任意自定义模型（如 `claude-3-haiku-20240307`），需等价目表更新

### 方案 B：自由输入 model + 强制 `--api-key`

- 优点：用户完全自由，可用私有部署模型
- 缺点：
  - 成本估算失效（不在价目表的模型返回 0）
  - `--api-key` 落 shell history + CI 日志，泄漏风险高
  - 用户输入模型名拼写错误时 LLM provider 返回 404，体验差

### 方案 C：保持现状 + 仅加文档

- 优点：零代码改动
- 缺点：UX 缺陷未解决，违反用户明确反馈

## 影响

### 正面影响

- 交互流完整：从"选模式"到"跑 agent"不再有隐藏自动推断
- 成本可预期：用户知道选的是哪档模型、每千 token 多少钱
- CI 可脚本化：`gforge init --deep-agent --depth deep --model claude-sonnet-4-5 --yes`
- 风险可控：key 始终通过 env / stdin 交付，不走 CLI argv

### 负面影响 / 权衡

- Stage 5 交互增加 2~3 步（provider 可自动省略单选；model 可默认推荐）
- `MODEL_PRICING` 成了 source of truth，需与 provider 发布同步更新
- `.env.local` 写入能力**不做**（风险 > 收益，`.gitignore` 未覆盖时易泄漏）

## 实施细节

### 1. `src/core/agents/deep-agent/config.ts`

```ts
export interface ModelChoice {
  id: string
  label: string
  recommendedFor?: Depth[]
}

export const ANTHROPIC_MODEL_CHOICES: ModelChoice[] = [
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5（$1/$5）—— 快且便宜', recommendedFor: ['shallow', 'medium'] },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5（$3/$15）—— 质量优先', recommendedFor: ['deep'] },
]

export const OPENAI_MODEL_CHOICES: ModelChoice[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini（$0.15/$0.6）—— 极致便宜', recommendedFor: ['shallow', 'medium'] },
  { id: 'gpt-4o', label: 'GPT-4o（$2.5/$10）—— 质量优先', recommendedFor: ['deep'] },
]
```

### 2. `DeepAgentOptions` 新增 `model?: string` + `apiKey?: string`

```ts
export interface DeepAgentOptions {
  // 现有字段...
  provider?: AgentProvider
  /** 显式覆盖模型；优先级 > DEFAULT_MODELS[depth][provider] */
  model?: string
  /** 显式覆盖 API Key；优先级 > env */
  apiKey?: string
}
```

### 3. `resolveProvider` 与 `resolveCredentials`

```ts
function resolveCredentials(
  explicitProvider?: AgentProvider,
  explicitKey?: string,
): CredentialsResolved | CredentialsFailed {
  // 显式 provider + 显式 key：直用
  if (explicitProvider && explicitKey) return { ok: true, provider: explicitProvider, apiKey: explicitKey }
  // 否则走 env 回填
  // ...
}
```

### 4. `llm-completer.ts` 参数化

```ts
export interface LlmCompleterOptions {
  // 现有字段...
  model?: string  // 默认按 provider 回落到 MODEL_DEFAULTS[provider]
  apiKey?: string  // 默认读 env
}
```

### 5. `init-interactive.ts` Stage 5

选定 `llm-enhance` 或 `deep-agent` 之后追加：

```ts
// Step A: 选 provider（两个 env 都存在时让用户选；只有一个则自动）
const provider = await pickProvider()

// Step B: 选 model（列表，按 depth 标注 "推荐"）
const model = await pickModel(provider, depth)

// Step C: API Key（env 已设则跳过 + dim 提示；未设则 p.password 输入，仅本次会话）
const apiKey = hasEnvKey(provider) ? process.env[keyName]! : await p.password({ message: `${provider} API Key`, mask: '*' })
```

### 6. CLI `--model` / `--provider` / `--api-key`

```ts
.option('--model <id>', 'LLM 模型 ID（如 claude-sonnet-4-5 / gpt-4o），不指定则按 depth 回落')
.option('--provider <name>', 'LLM 供应商：anthropic | openai')
.option('--api-key <key>', 'LLM API Key（⚠️ 会进入 shell history，生产环境建议改用 env）')
```

非交互模式优先级：
- `model = options.model ?? DEFAULT_MODELS[depth][provider]`
- `apiKey = options.apiKey ?? env[ANTHROPIC_API_KEY | OPENAI_API_KEY]`

**安全警告**：`--api-key` 触发时 CLI 立即打印黄色 `⚠️  通过 --api-key 传入密钥会进入 shell history...` 提示，督促用户改用 env 变量。

## AI 指引

- **新增 provider 或 model 时**：同步更新 `config.ts` 的 `MODEL_PRICING` / `ANTHROPIC_MODEL_CHOICES` / `OPENAI_MODEL_CHOICES` / `DEFAULT_MODELS`，并在 PR 中更新 `PRICING_AS_OF`
- **生成代码涉及模型调用时**：永远走 `options.model` → `DEFAULT_MODELS[depth][provider]` 的回落链，禁止在新代码中硬编码模型 ID
- **涉及 API Key 时**：允许 `--api-key` 传入但必须在 CLI 入口打印 shell history 警告；**禁止**写入任何日志 / trace 文件 / `.env.local`；生产环境优先用 env / `p.password()`
- **非交互模式**：`--model` 拼写错误时应 friendly-fail（列出 `MODEL_PRICING` 所有合法 ID）而非静默 fallback

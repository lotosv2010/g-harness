---
id: ADR-009
status: accepted
date: 2026-04-24
superseded_by: null
---

# LLM 补全层的白名单字段 + 透明降级

## 背景

v1.3 引入了智能内容补全（`src/core/analyzer/`）：从项目描述 + 技术栈推导 SPEC / ARCHITECTURE 的结构化内容。规则版（关键词匹配 + 预设片段库）能覆盖 80% 场景，但三个叙述性字段表达生硬：

- `projectPositioning` —— 项目定位一句话，规则版只能拼接"XX 是一个 YY 应用"
- `productBoundaries` —— 产品边界（是什么 / 不是什么），规则版依赖预设模板固定表述
- `moduleBreakdown` —— 模块清单叙述，规则版只能列表堆叠

期望：在**不强依赖 LLM**的前提下，让检测到 API key 的用户能获得 LLM 改写这三段内容的增强效果。关键约束：

1. **默认规则版**，LLM 是可选增强层
2. **失败必须透明降级**，不得因 LLM 故障中断 init 流程
3. **只覆盖白名单字段**，其他字段（表格 / NFR / 目录结构）必须保持规则版以保证一致性
4. **不引入新依赖**，使用内置 fetch 调用 Anthropic / OpenAI HTTP API

## 决策

实现 `src/core/analyzer/llm-completer.ts`，采用**白名单字段 + 透明降级 + 可注入 fetch** 三要素。

### 白名单字段

```typescript
const OVERRIDABLE_FIELDS = [
  'projectPositioning',
  'productBoundaries',
  'moduleBreakdown',
] as const
```

LLM 返回的 JSON 中，只有这三个字段会覆盖规则版结果；其他任何字段（即使 LLM 返回了）都被忽略。这保证：

- 模板变量 Schema 一致性（ADR-006）不被 LLM 随意扩展
- 表格 / NFR 等结构化内容保持规则版的确定性
- 即使 LLM 返回格式奇怪，降级路径依然是完整的规则版输出

### 透明降级

任何失败场景都返回 `{ completion: ruleBased, enhanced: false, reason: '...' }`：

| reason 取值 | 触发条件 |
|-------------|----------|
| `no-key` | 未检测到 `ANTHROPIC_API_KEY` 和 `OPENAI_API_KEY` |
| `timeout` | AbortError（15 秒超时） |
| `network-error` | fetch 抛出非 AbortError |
| `parse-error` | LLM 响应不是合法 JSON，或无法从代码块围栏中提取 JSON |
| `empty` | LLM 返回空对象，或白名单字段全为空字符串 |

CLI 通过 `onLlmResult` 回调打印降级原因（dim 色调），用户能感知但不会被阻断。

### 双供应商支持

| 优先级 | 供应商 | Model | API 端点 |
|--------|--------|-------|----------|
| 1 | Anthropic | `claude-haiku-4-5-20251001` | `api.anthropic.com/v1/messages` |
| 2 | OpenAI | `gpt-4o-mini` | `api.openai.com/v1/chat/completions` |

优先选择 Anthropic（项目价值主张与 Claude Code 对齐），同时 key 存在时以 Anthropic 为准。

### 可注入 fetch

`enhanceWithLlm(opts)` 接受可选 `fetchImpl` 参数，便于测试时注入 `vi.fn().mockResolvedValue(...)`，单测覆盖 9 个场景全部走 mock，不发网络请求。

## 备选方案

### 方案 A：强依赖 LLM（每次 init 必调）

- 优点：产出质量稳定高
- 缺点：无 key 用户无法 init；网络抖动阻断流程；违背 v1.0~v1.2 的"零外部依赖"承诺

### 方案 B：全字段由 LLM 覆盖

让 LLM 返回完整 `ContentCompletion`。

- 优点：实现简单
- 缺点：LLM 可能污染表格 / NFR 等结构化字段；失败时规则版与 LLM 版差异过大；prompt 复杂度爆炸

### 方案 C：本 ADR 决策（白名单 + 降级）

**白名单 3 个叙述字段 + 任何失败透明降级**。

## 采用：方案 C

## 影响

### 正面
- 对无 API key 用户零影响（规则版照常跑）
- 对有 API key 用户，SPEC.md 的 positioning / boundaries / modules 三段叙述显著改善
- 白名单机制把 LLM 故障面限制在 3 个字段内，其他字段的确定性不受影响
- 可注入 fetch 让 9 个单测全部离线运行，CI 零外部依赖

### 负面 / 权衡
- Prompt 工程需持续迭代：当前 prompt 在 g-forge 自身已验证，但跨领域（如物联网、嵌入式）可能需要调整
- 单测覆盖 happy path + 5 类失败路径，但未覆盖"LLM 返回白名单字段但内容质量极差"的场景 —— 此类降级依赖人工 review
- 15 秒超时对弱网环境可能偏短，后续可改为可配置

## AI 指引

- 实现集中在 `src/core/analyzer/llm-completer.ts`
- 供应商顺序：Anthropic 优先 → OpenAI 兜底 → no-key 降级
- 新增供应商时，遵循"返回 `{ completion, provider, enhanced, reason }`"的统一签名
- 修改 `OVERRIDABLE_FIELDS` 需同步更新单测 `llm-completer.test.ts` 的"whitelist-only field acceptance"用例
- Prompt 模板中必须强调"仅返回 JSON 对象，不要 markdown 代码块" —— 即便如此，parser 仍需容错代码块围栏（` ```json ... ``` `）
- CLI 回调 `onLlmResult` 必须打印 reason 以便用户定位降级原因

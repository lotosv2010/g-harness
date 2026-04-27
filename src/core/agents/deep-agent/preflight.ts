// Deep Agent pre-flight 预估：在真正触发 LLM 之前给用户看成本预估。

import { DEPTH_PROFILES, MODEL_PRICING, PRICING_AS_OF, calcCost } from './config.js'
import type { Depth, EstimateReport } from './types.js'

/**
 * 基于 depth 档位与模型估算 token / USD / 时长。
 * 估算口径（保守）：
 *   input tokens  ≈ maxTokens * 0.65
 *   output tokens ≈ maxTokens * 0.20
 *   duration      ≈ totalTimeoutMs * 0.35
 */
export function estimate(depth: Depth, model: string): EstimateReport {
  const profile = DEPTH_PROFILES[depth]
  const inTokens = Math.round(profile.maxTokens * 0.65)
  const outTokens = Math.round(profile.maxTokens * 0.2)
  const usd = calcCost(model, inTokens, outTokens)
  return {
    depth,
    estimatedInputTokens: inTokens,
    estimatedOutputTokens: outTokens,
    estimatedUsd: usd,
    estimatedDurationSec: Math.round((profile.totalTimeoutMs * 0.35) / 1000),
    pricingAsOf: PRICING_AS_OF,
  }
}

/** 校验模型 ID 是否在价目表内 */
export function isSupportedModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICING, model)
}

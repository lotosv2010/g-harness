// Pre-flight 预估 —— 在真正跑 Agent 前给出 token/费用/耗时预测
//
// 定位：
// - 让用户在 Stage 6 预览时看到"预计花多少钱、跑多久"
// - 预估源于三档 depth 的"基线系数"+ 项目规模（源文件数、README 行数、package 依赖数）
// - 不精确、但稳定（后续 TASK-097 会用实测数据校准系数）
// - 永不失败：任何异常都返回保守估计（本档上限）

import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  DEPTH_PROFILES,
  DEFAULT_MODELS,
  MODEL_PRICING,
  PRICING_AS_OF,
  calcCost,
} from './config.js'
import type { AgentProvider, Depth, EstimateReport } from './types.js'

export interface PreflightOptions {
  targetDir: string
  depth: Depth
  /** 显式指定，否则按环境自动（anthropic 优先） */
  provider?: AgentProvider
  /** 可选已知采样文件清单（例如 scanner 已识别的入口） */
  knownSampledFiles?: string[]
}

/** 三档基线系数（后续由 TASK-097 校准） */
const DEPTH_BASELINE: Record<
  Depth,
  {
    /** 每文件估算 input token 消耗 */
    perFileInput: number
    /** 输出 token（总体写四份文档）基线 */
    outputBase: number
    /** 额外的 "思考" token（循环中消耗） */
    reasoningBase: number
    /** 预估耗时基线（秒） */
    durationBase: number
    /** 每 1000 token 增加的秒数 */
    durationPerKToken: number
    /** 本档采样文件数上限 */
    maxSampledFiles: number
  }
> = {
  shallow: {
    perFileInput: 0, // shallow 不读源文件
    outputBase: 4_500,
    reasoningBase: 2_500,
    durationBase: 20,
    durationPerKToken: 0.6,
    maxSampledFiles: 0,
  },
  medium: {
    perFileInput: 1_200,
    outputBase: 6_000,
    reasoningBase: 6_000,
    durationBase: 40,
    durationPerKToken: 0.8,
    maxSampledFiles: 8,
  },
  deep: {
    perFileInput: 1_500,
    outputBase: 8_000,
    reasoningBase: 15_000,
    durationBase: 90,
    durationPerKToken: 1.0,
    maxSampledFiles: 20,
  },
}

/**
 * 估算 Deep Agent 本次运行的成本与耗时。
 * 上界为该档的 maxTokens / totalTimeoutMs（来自 DEPTH_PROFILES）。
 */
export async function estimateRun(opts: PreflightOptions): Promise<EstimateReport> {
  const baseline = DEPTH_BASELINE[opts.depth]
  const profile = DEPTH_PROFILES[opts.depth]
  const provider: AgentProvider = opts.provider ?? detectProvider()
  const model = DEFAULT_MODELS[opts.depth][provider]

  let sampledFiles: string[] = []
  if (baseline.maxSampledFiles > 0) {
    try {
      sampledFiles = await sampleSourceFiles(opts.targetDir, baseline.maxSampledFiles, opts.knownSampledFiles)
    } catch {
      sampledFiles = opts.knownSampledFiles?.slice(0, baseline.maxSampledFiles) ?? []
    }
  }

  const inputTokens = clamp(
    baseline.reasoningBase + baseline.perFileInput * sampledFiles.length,
    0,
    Math.floor(profile.maxTokens * 0.7),
  )
  const outputTokens = clamp(baseline.outputBase, 0, Math.floor(profile.maxTokens * 0.3))
  const estimatedUsd = calcCost(model, inputTokens, outputTokens)

  const tokensK = (inputTokens + outputTokens) / 1000
  const estimatedDurationSec = Math.min(
    Math.ceil(baseline.durationBase + tokensK * baseline.durationPerKToken),
    Math.floor(profile.totalTimeoutMs / 1000),
  )

  return {
    depth: opts.depth,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedUsd,
    estimatedDurationSec,
    sampledFiles: sampledFiles.length > 0 ? sampledFiles : undefined,
    pricingAsOf: PRICING_AS_OF,
  }
}

/** 预览字符串：`预计 ~12k token / ~$0.018 / ~55s（medium，Haiku，价目 2026-04-01）` */
export function formatEstimate(report: EstimateReport, provider: AgentProvider): string {
  const model = DEFAULT_MODELS[report.depth][provider]
  const p = MODEL_PRICING[model]
  const modelLabel = p ? model : '未知模型'
  const tokens = report.estimatedInputTokens + report.estimatedOutputTokens
  const tokensK = (tokens / 1000).toFixed(1)
  return `预计 ~${tokensK}k token / ~$${report.estimatedUsd.toFixed(4)} / ~${report.estimatedDurationSec}s（${report.depth}，${modelLabel}，价目 ${report.pricingAsOf}）`
}

// --- helpers -----------------------------------------------------------------

function detectProvider(): AgentProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'anthropic'
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo
  if (n > hi) return hi
  return n
}

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.py', '.go', '.rs'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.turbo', '.cache'])

async function sampleSourceFiles(
  rootDir: string,
  max: number,
  known?: string[],
): Promise<string[]> {
  const picked: string[] = []
  if (known && known.length > 0) {
    for (const f of known) {
      if (picked.length >= max) break
      picked.push(f)
    }
  }
  if (picked.length >= max) return picked

  const queue: string[] = ['src', 'app', 'pages', 'server', 'lib', '.']
  for (const rel of queue) {
    if (picked.length >= max) break
    const abs = join(rootDir, rel)
    try {
      const info = await stat(abs)
      if (!info.isDirectory()) continue
    } catch {
      continue
    }
    await walkCollect(abs, picked, max, rootDir)
  }
  return picked.slice(0, max)
}

async function walkCollect(
  dir: string,
  out: string[],
  max: number,
  rootDir: string,
): Promise<void> {
  if (out.length >= max) return
  let entries: { name: string; isDir: boolean }[] = []
  try {
    const raw = await readdir(dir, { withFileTypes: true })
    entries = raw.map((e) => ({ name: e.name, isDir: e.isDirectory() }))
  } catch {
    return
  }
  for (const e of entries) {
    if (out.length >= max) return
    if (e.name.startsWith('.') && e.name !== '.') continue
    if (SKIP_DIRS.has(e.name)) continue
    const abs = join(dir, e.name)
    if (e.isDir) {
      await walkCollect(abs, out, max, rootDir)
    } else {
      const dot = e.name.lastIndexOf('.')
      if (dot < 0) continue
      const ext = e.name.slice(dot).toLowerCase()
      if (!SOURCE_EXTS.has(ext)) continue
      const rel = abs.slice(rootDir.length + 1).replace(/\\/g, '/')
      out.push(rel)
    }
  }
}

// Preset 加载器 —— Schema v2（v0.2.0）

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from './fs-utils.js'

export interface PresetTechStack {
  language?: string
  runtime?: string
  framework?: string
  buildTool?: string
  testRunner?: string
  packageManager?: string
}

export interface PresetDetect {
  dependencies?: string[]
  files?: string[]
}

export interface PresetArchitecture {
  /** 架构分层一句话概述（注入 architecture_overview） */
  overview?: string
  /** 结构示例树（注入 project_structure） */
  structure?: string
}

/** Preset Schema v2（v0.2.0） */
export interface Preset {
  $schema?: string
  name: string
  label: string
  description?: string
  techStack: PresetTechStack
  detect?: PresetDetect
  /** 注入到模板变量（如 shared_dir / feature_dir） */
  variables?: Record<string, string>
  /** 命令表 —— 用于 commands 变量 */
  commands?: Record<string, string>
  architecture?: PresetArchitecture
  /** 推荐模块清单 */
  modules?: string[]
  /** 编码规则片段（多条） */
  rules?: string[]
  /** 非功能性要求条目 */
  nfr?: string[]
  /** Deep Agent 知识库标识符，默认等于 name */
  knowledgeSlug?: string
}

/** 加载单个预设 */
export async function loadPreset(harnessRoot: string, presetName: string): Promise<Preset | null> {
  try {
    const presetPath = join(harnessRoot, 'src', 'presets', presetName, 'preset.json')
    const content = await readFile(presetPath, 'utf-8')
    return JSON.parse(content) as Preset
  } catch {
    return null
  }
}

/**
 * 预设展示顺序（CLI 选单）——按使用频率与类别聚合：
 * 通用 → Web 前端 → 跨端 → 服务端 → 工程组织 → 桌面/移动原生
 */
const PRESET_ORDER: readonly string[] = [
  'base',
  'vanilla',
  'vite-react',
  'vite-vue',
  'nextjs',
  'nuxt',
  'uniapp',
  'miniprogram',
  'nestjs',
  'express',
  'fastapi',
  'monorepo',
  'electron',
  'tauri',
  'react-native',
  'flutter',
]

/**
 * 基于 package.json 依赖 + 特征文件，自动推断最匹配的 preset.name。
 * 规则（从具体到通用，首个命中即返回）：
 * 1. preset.detect.dependencies 全部出现在 deps 中 → 命中
 * 2. preset.detect.files 任一在 targetDir 存在 → 命中
 * 返回值：命中的 preset.name；无命中返回 null。
 */
export async function detectPreset(
  harnessRoot: string,
  targetDir: string,
): Promise<string | null> {
  const presets = await listPresets(harnessRoot)
  if (presets.length === 0) return null

  let pkgDeps: Record<string, string> = {}
  try {
    const raw = await readFile(join(targetDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    pkgDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  } catch {
    // 无 package.json 也可依赖 files 特征文件判定
  }

  // 收集所有命中项，按「依赖命中数 + 文件命中数」打分，分最高者胜出
  type Hit = { name: string; score: number; order: number }
  const hits: Hit[] = []

  for (const preset of presets) {
    const detect = preset.detect
    if (!detect) continue
    let score = 0

    const deps = detect.dependencies ?? []
    if (deps.length > 0 && deps.every((d) => d in pkgDeps)) {
      score += deps.length * 10 // 全命中加权
    } else {
      for (const d of deps) if (d in pkgDeps) score += 1
    }

    for (const file of detect.files ?? []) {
      if (await fileExists(join(targetDir, file))) score += 5
    }

    if (score > 0) {
      hits.push({ name: preset.name, score, order: PRESET_ORDER.indexOf(preset.name) })
    }
  }

  if (hits.length === 0) return null
  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // 同分时按 PRESET_ORDER（更具体的框架靠前）
    const ax = a.order === -1 ? Number.MAX_SAFE_INTEGER : a.order
    const bx = b.order === -1 ? Number.MAX_SAFE_INTEGER : b.order
    return ax - bx
  })
  return hits[0].name
}

/** 列出所有可用预设（用于交互式选择），按 PRESET_ORDER 排序 */
export async function listPresets(harnessRoot: string): Promise<Preset[]> {
  const presetsDir = join(harnessRoot, 'src', 'presets')
  try {
    const entries = await readdir(presetsDir, { withFileTypes: true })
    const results: Preset[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const preset = await loadPreset(harnessRoot, entry.name)
      if (preset) results.push(preset)
    }
    return results.sort((a, b) => {
      const ai = PRESET_ORDER.indexOf(a.name)
      const bi = PRESET_ORDER.indexOf(b.name)
      // 未收录条目排到末尾，同类按字母
      const ax = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
      const bx = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
      if (ax !== bx) return ax - bx
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

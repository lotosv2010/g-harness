// Preset 加载器 —— Schema v2（v0.2.0）

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

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

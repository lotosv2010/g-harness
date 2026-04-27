import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface PresetFragment {
  /** 架构分层说明（覆盖 content-completer 的应用类型默认值） */
  architectureLayers?: string
  /** 推荐模块清单（覆盖 analyzer.suggestedModules 的默认值） */
  defaultModules?: string[]
  /** 项目结构示例（覆盖 project_structure_hint） */
  structureHint?: string
  /** 额外的 NFR 要点 */
  extraNfr?: string[]
}

export interface Preset {
  name: string
  description: string
  techStack: Record<string, string>
  variables: Record<string, string>
  codeStyle: string[]
  commands: Record<string, string>
  fragments?: PresetFragment
}

export async function loadPreset(
  harnessRoot: string,
  presetName: string,
): Promise<Preset | null> {
  try {
    const presetPath = join(harnessRoot, 'src', 'presets', presetName, 'preset.json')
    const content = await readFile(presetPath, 'utf-8')
    return JSON.parse(content) as Preset
  } catch {
    return null
  }
}

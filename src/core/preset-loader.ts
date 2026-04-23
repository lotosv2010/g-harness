import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Preset {
  name: string
  description: string
  techStack: Record<string, string>
  variables: Record<string, string>
  codeStyle: string[]
  commands: Record<string, string>
}

export async function loadPreset(
  gforgeRoot: string,
  presetName: string,
): Promise<Preset | null> {
  try {
    const presetPath = join(gforgeRoot, 'presets', presetName, 'preset.json')
    const content = await readFile(presetPath, 'utf-8')
    return JSON.parse(content) as Preset
  } catch {
    return null
  }
}

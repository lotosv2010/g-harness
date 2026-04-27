// 从 package.json / README.md 自动推断 ProjectMeta 默认值

import { readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ProjectMeta } from '../commands/init-types.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface AutoDescribeInput {
  targetDir: string
  scanResult: ScanResult
}

/**
 * 产出 ProjectMeta 的默认值。
 * 用于交互向导初值，也用于非交互（--yes）时的回退。
 */
export async function autoDescribe(input: AutoDescribeInput): Promise<ProjectMeta> {
  const { targetDir, scanResult } = input
  const pkg = await readPackageJson(targetDir)
  const readmeFirstLine = await readReadmeFirstLine(targetDir)

  const projectName = pkg?.name?.trim() || basename(targetDir) || 'my-project'
  const projectDescription = pkg?.description?.trim() || readmeFirstLine || ''
  const srcDir = scanResult.structure.srcDir ?? 'src'
  const techStackText = toTechStackText(scanResult)

  return { projectName, projectDescription, srcDir, techStackText }
}

async function readPackageJson(
  targetDir: string,
): Promise<{ name?: string; description?: string } | null> {
  try {
    const raw = await readFile(join(targetDir, 'package.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { name?: string; description?: string }
    return parsed
  } catch {
    return null
  }
}

async function readReadmeFirstLine(targetDir: string): Promise<string | null> {
  const candidates = ['README.md', 'README.rst', 'README.txt']
  for (const name of candidates) {
    try {
      const raw = await readFile(join(targetDir, name), 'utf-8')
      const first = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith('#'))
      if (first) return first
    } catch {
      // 继续下一个
    }
  }
  return null
}

function toTechStackText(scan: ScanResult): string {
  const { techStack } = scan
  const parts = [
    techStack.language,
    techStack.framework,
    techStack.buildTool,
    techStack.testRunner,
    techStack.packageManager,
  ].filter((v): v is string => Boolean(v))
  return parts.join(', ')
}

import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileExists, readDirSafe, statSafe, isDirectory } from '../fs-utils.js'

/** G-Forge 管理文件的标记模式 */
const GFORGE_MARKERS = [
  '由 G-Forge 生成',
  'G-Forge generated',
  'gforge-version:',
]

/** G-Forge 已知的管理路径（相对于目标项目根目录） */
const MANAGED_PATHS = [
  'CLAUDE.md',
  'AGENTS.md',
  '.claude/rules',
  '.claude/protocols',
  '.claude/guardrails',
  '.claude/prompts',
  '.claude/skills',
  '.claude/hooks',
  '.claude/settings.json',
  'docs/ARCHITECTURE.md',
  'docs/SPEC.md',
  'docs/DESIGN.md',
  'docs/API.md',
  'docs/DATA_MODEL.md',
]

/** 扫描到的受管文件信息 */
export interface ManagedFile {
  /** 相对于目标项目根目录的路径 */
  relativePath: string
  /** 文件内容 */
  content: string
  /** 是否包含 G-Forge 标记 */
  hasMarker: boolean
}

/**
 * 扫描目标项目中所有受 G-Forge 管理的文件
 */
export async function scanManagedFiles(targetDir: string): Promise<ManagedFile[]> {
  const results: ManagedFile[] = []

  for (const managedPath of MANAGED_PATHS) {
    const fullPath = join(targetDir, managedPath)
    const isDir = await isDirectory(fullPath)

    if (isDir) {
      const dirFiles = await collectDirFiles(fullPath, targetDir)
      results.push(...dirFiles)
    } else {
      const file = await readManagedFile(fullPath, targetDir)
      if (file) results.push(file)
    }
  }

  return results
}

/**
 * 检测文件内容是否包含 G-Forge 管理标记
 */
export function hasGForgeMarker(content: string): boolean {
  // 只检查文件前 500 个字符（标记通常在头部）
  const header = content.slice(0, 500)
  return GFORGE_MARKERS.some((marker) => header.includes(marker))
}

/** 递归收集目录中的所有文件 */
async function collectDirFiles(
  dirPath: string,
  targetDir: string,
): Promise<ManagedFile[]> {
  const results: ManagedFile[] = []

  const entries = await readDirSafe(dirPath)
  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    const entryStat = await statSafe(fullPath)
    if (!entryStat) continue

    if (entryStat.isDirectory()) {
      const subFiles = await collectDirFiles(fullPath, targetDir)
      results.push(...subFiles)
    } else {
      const file = await readManagedFile(fullPath, targetDir)
      if (file) results.push(file)
    }
  }

  return results
}

/** 读取单个文件，返回 ManagedFile 或 null（文件不存在时） */
async function readManagedFile(
  fullPath: string,
  targetDir: string,
): Promise<ManagedFile | null> {
  try {
    if (!(await fileExists(fullPath))) return null
    const content = await readFile(fullPath, 'utf-8')
    const relativePath = relative(targetDir, fullPath).replace(/\\/g, '/')
    return {
      relativePath,
      content,
      hasMarker: hasGForgeMarker(content),
    }
  } catch {
    return null
  }
}


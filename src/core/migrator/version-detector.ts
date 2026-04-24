import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** 默认版本号（未检测到时使用） */
const UNKNOWN_VERSION = '0.0.0'

/** .gforge-version 文件名 */
const VERSION_FILE = '.gforge-version'

/** CLAUDE.md 中版本注释的正则模式 */
const VERSION_COMMENT_PATTERN = /gforge-version:\s*([\d.]+)/

/**
 * 从目标项目中自动检测当前 G-Forge 版本
 *
 * 检测顺序：
 * 1. .gforge-version 文件
 * 2. CLAUDE.md 中的版本注释
 * 3. 返回未知版本 '0.0.0'
 */
export async function detectVersion(targetDir: string): Promise<string> {
  // 优先检查 .gforge-version 文件
  const fromFile = await readVersionFile(targetDir)
  if (fromFile) return fromFile

  // 其次检查 CLAUDE.md 中的版本注释
  const fromClaudeMd = await readVersionFromClaudeMd(targetDir)
  if (fromClaudeMd) return fromClaudeMd

  return UNKNOWN_VERSION
}

/**
 * 获取 G-Forge CLI 自身的当前版本
 */
export function getCurrentVersion(): string {
  // 与 package.json 中的版本保持一致
  return '0.1.0'
}

/**
 * 比较两个语义化版本，返回是否需要迁移
 */
export function needsMigration(fromVersion: string, toVersion: string): boolean {
  if (fromVersion === toVersion) return false
  if (fromVersion === UNKNOWN_VERSION) return true

  const fromParts = parseVersion(fromVersion)
  const toParts = parseVersion(toVersion)

  // 主版本或次版本有差异即需要迁移
  return (
    toParts.major > fromParts.major ||
    (toParts.major === fromParts.major && toParts.minor > fromParts.minor) ||
    (toParts.major === fromParts.major &&
      toParts.minor === fromParts.minor &&
      toParts.patch > fromParts.patch)
  )
}

interface VersionParts {
  major: number
  minor: number
  patch: number
}

function parseVersion(version: string): VersionParts {
  const parts = version.split('.').map(Number)
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  }
}

/** 从 .gforge-version 文件读取版本 */
async function readVersionFile(targetDir: string): Promise<string | null> {
  try {
    const content = await readFile(join(targetDir, VERSION_FILE), 'utf-8')
    const trimmed = content.trim()
    if (/^\d+\.\d+\.\d+$/.test(trimmed)) return trimmed
    return null
  } catch {
    return null
  }
}

/** 从 CLAUDE.md 的头部注释中读取版本 */
async function readVersionFromClaudeMd(targetDir: string): Promise<string | null> {
  try {
    const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8')
    // 只检查文件前 500 字符
    const header = content.slice(0, 500)
    const match = VERSION_COMMENT_PATTERN.exec(header)
    return match ? match[1] : null
  } catch {
    return null
  }
}

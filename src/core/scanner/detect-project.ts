// 项目检测：判断目标目录的项目状态（新建 / 已有 / 已接入 G-Harness）

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from '../fs-utils.js'
import { AGENT_REGISTRY } from '../agents/agent-registry.js'
import type { ScanResult } from './project-scanner.js'

export interface ProjectDetection {
  isEmpty: boolean
  hasPackageJson: boolean
  hasGit: boolean
  hasHarnessConfig: boolean
  harnessVersion: string | null
  existingAgents: string[]
  scanResult: ScanResult
}

export type ProjectMode = 'new' | 'existing' | 'reinit'

export function resolveProjectMode(detection: ProjectDetection): ProjectMode {
  if (detection.isEmpty) return 'new'
  if (detection.hasHarnessConfig) return 'reinit'
  return 'existing'
}

export async function detectProject(
  rootDir: string,
  scanResult: ScanResult,
): Promise<ProjectDetection> {
  const [isEmpty, hasPackageJson, hasGit, agentResult, harnessVersion] = await Promise.all([
    checkEmpty(rootDir),
    fileExists(join(rootDir, 'package.json')),
    fileExists(join(rootDir, '.git')),
    detectExistingAgents(rootDir),
    detectHarnessVersion(rootDir),
  ])

  const hasHarnessConfig = agentResult.length > 0 || harnessVersion !== null

  return {
    isEmpty,
    hasPackageJson,
    hasGit,
    hasHarnessConfig,
    harnessVersion,
    existingAgents: agentResult,
    scanResult,
  }
}

async function checkEmpty(rootDir: string): Promise<boolean> {
  try {
    const entries = await readdir(rootDir)
    const meaningful = entries.filter((e) => e !== '.git' && e !== '.DS_Store' && e !== 'Thumbs.db')
    return meaningful.length === 0
  } catch {
    return true
  }
}

async function detectExistingAgents(rootDir: string): Promise<string[]> {
  const found: string[] = []

  for (const agent of AGENT_REGISTRY) {
    if (!agent.entryFile || agent.id === 'generic') continue
    if (await fileExists(join(rootDir, agent.entryFile))) {
      found.push(agent.id)
    }
  }

  return found
}

async function detectHarnessVersion(rootDir: string): Promise<string | null> {
  const agentsPath = join(rootDir, 'AGENTS.md')
  try {
    const content = await readFile(agentsPath, 'utf-8')
    // 匹配 "G-Harness vX.Y.Z" 或 "G-Harness X.Y.Z" 或 "g-harness@X.Y.Z"
    const match = content.match(/[Gg]-?[Hh]arness\s+v?([\d]+\.[\d]+\.[\d]+)/)
      ?? content.match(/g-harness@([\d]+\.[\d]+\.[\d]+)/)
    if (match) return match[1]
    // 有 G-Harness 生成标记但无版本号
    if (content.includes('G-Harness') || content.includes('g-harness')) return 'unknown'
    return null
  } catch {
    return null
  }
}

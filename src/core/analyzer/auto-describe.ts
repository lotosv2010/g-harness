// 自动描述推导器 — 从 package.json + README 提取项目描述，供老项目 init 场景使用
// 纯规则、无 LLM

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileExists } from '../fs-utils.js'

export interface AutoDescribeResult {
  projectName: string | null
  description: string | null
  sources: string[]
}

export async function autoDescribe(rootDir: string): Promise<AutoDescribeResult> {
  const sources: string[] = []
  let projectName: string | null = null
  let description: string | null = null

  // 1. 优先从 package.json 读取
  const pkgPath = join(rootDir, 'package.json')
  if (await fileExists(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as Record<string, unknown>
      if (typeof pkg.name === 'string' && pkg.name.trim()) {
        projectName = pkg.name.trim()
        sources.push('package.json:name')
      }
      if (typeof pkg.description === 'string' && pkg.description.trim()) {
        description = pkg.description.trim()
        sources.push('package.json:description')
      }
    } catch {
      // 忽略解析失败
    }
  }

  // 2. README 第一段作为补充（仅当 description 为空时）
  if (!description) {
    const readmeCandidates = ['README.md', 'README.MD', 'Readme.md', 'readme.md']
    for (const candidate of readmeCandidates) {
      const readmePath = join(rootDir, candidate)
      if (await fileExists(readmePath)) {
        const extracted = await extractReadmeIntro(readmePath)
        if (extracted) {
          description = extracted
          sources.push(`${candidate}:intro`)
        }
        break
      }
    }
  }

  return { projectName, description, sources }
}

async function extractReadmeIntro(path: string): Promise<string | null> {
  try {
    const content = await readFile(path, 'utf-8')
    const lines = content.split(/\r?\n/)
    const paragraphs: string[] = []
    let current: string[] = []

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (line.startsWith('#') || line.startsWith('==') || line.startsWith('--')) {
        // 标题/分隔线，结束当前段落
        if (current.length > 0) {
          paragraphs.push(current.join(' '))
          current = []
        }
        continue
      }
      if (line.startsWith('![') || line.startsWith('[![') || line.startsWith('>')) {
        // 徽章 / 引用块，跳过
        continue
      }
      if (line === '') {
        if (current.length > 0) {
          paragraphs.push(current.join(' '))
          current = []
          if (paragraphs.length > 0) break
        }
        continue
      }
      current.push(line)
    }
    if (current.length > 0) paragraphs.push(current.join(' '))

    const first = paragraphs[0]?.trim()
    if (!first) return null

    // 截断到合理长度
    const clean = first.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`/g, '')
    return clean.length > 280 ? `${clean.slice(0, 277)}...` : clean
  } catch {
    return null
  }
}

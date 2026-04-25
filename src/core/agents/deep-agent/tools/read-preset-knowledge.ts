// readPresetKnowledge —— 读取内置预设知识库 MD
// knowledge/ 目录与 deep-agent 源码同级部署；打包后通过 import.meta.url 定位

import { readFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

export interface ReadPresetKnowledgeResult {
  presetName: string
  found: boolean
  path?: string
  content: string
}

export interface PresetKnowledgeContext {
  /** 覆盖 knowledge 目录定位（测试用） */
  knowledgeDirOverride?: string
}

/**
 * 读取 knowledge/<presetName>.md。
 * presetName 必须匹配 ^[a-z0-9-]+$，防止路径穿越。
 */
export async function readPresetKnowledge(
  presetName: string,
  ctx: PresetKnowledgeContext = {},
): Promise<ReadPresetKnowledgeResult> {
  if (!presetName || !/^[a-z0-9-]+$/i.test(presetName)) {
    return {
      presetName,
      found: false,
      content: '【非法 preset 名】必须匹配 ^[a-z0-9-]+$',
    }
  }

  const knowledgeDir = ctx.knowledgeDirOverride ?? resolveKnowledgeDir()
  const abs = resolve(knowledgeDir, `${presetName.toLowerCase()}.md`)

  // 约束：abs 必须位于 knowledgeDir 下
  if (!abs.startsWith(resolve(knowledgeDir))) {
    return { presetName, found: false, content: '【路径越界】' }
  }

  try {
    const content = await readFile(abs, 'utf-8')
    return { presetName, found: true, path: abs, content }
  } catch {
    const available = await listKnowledge(knowledgeDir)
    return {
      presetName,
      found: false,
      content: `【预设 "${presetName}" 暂无知识库】可用：${available.join(', ') || '(空)'}`,
    }
  }
}

async function listKnowledge(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    return entries.filter((e) => e.endsWith('.md')).map((e) => e.replace(/\.md$/, ''))
  } catch {
    return []
  }
}

/**
 * 解析 knowledge 目录绝对路径：
 * - 源码运行：src/core/agents/deep-agent/tools/ → 上级 knowledge/
 * - 打包后：tsc 不复制 .md；执行时优先 dist 上级再回落到仓库 src 源（供开发/link 模式）
 */
function resolveKnowledgeDir(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', 'knowledge')
}

/** 仅供测试：判断内置 knowledge 是否已就位（同步不抛错） */
export async function knowledgeDirExists(): Promise<boolean> {
  try {
    const s = await stat(resolveKnowledgeDir())
    return s.isDirectory()
  } catch {
    return false
  }
}

export function formatPresetKnowledgeResult(r: ReadPresetKnowledgeResult): string {
  if (!r.found) return r.content
  return `【预设 ${r.presetName} 知识库】\n\n${r.content}`
}

export const READ_PRESET_KNOWLEDGE_DESCRIPTION =
  '读取当前预设的内置知识库（包含该技术栈最佳实践/分层/陷阱）。参数：{ presetName: string }。presetName 必须匹配 ^[a-z0-9-]+$。'

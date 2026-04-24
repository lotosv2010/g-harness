/**
 * 差异比较引擎 — 对比模板段落与用户自定义段落
 *
 * 策略：
 * - 以 Markdown 二级标题（## ）作为段落分隔符
 * - 包含 {{variable}} 占位符的段落视为模板段落
 * - 不包含占位符且被用户修改过的段落视为用户段落
 * - 文件头部（第一个 ## 之前）包含 G-Forge 标记的视为模板头部
 */

import { mergeSections, calculateCustomization, normalizeWhitespace } from './section-merger.js'

/** 文件段落 */
export interface Section {
  /** 段落标题（空字符串表示文件头部） */
  heading: string
  /** 段落完整内容（包含标题行） */
  content: string
}

/** 差异比较结果 */
export interface DiffResult {
  /** 文件是否发生了变化 */
  hasChanges: boolean
  /** 合并后的完整内容 */
  mergedContent: string
  /** 用户深度自定义程度（0~1），超过阈值标记为 manualRequired */
  customizationRatio: number
}

/** 用户自定义程度阈值，超过此值需手动审查 */
const HEAVY_CUSTOMIZATION_THRESHOLD = 0.6

/**
 * 对比目标文件与新模板，生成合并结果
 *
 * @param currentContent - 目标项目中的当前文件内容
 * @param templateContent - 新版本模板内容（带 {{variable}} 占位符已解析）
 * @returns 差异比较结果
 */
export function diffAndMerge(
  currentContent: string,
  templateContent: string,
): DiffResult {
  const currentSections = parseSections(currentContent)
  const templateSections = parseSections(templateContent)

  // 如果内容完全相同，无需变更
  if (normalizeWhitespace(currentContent) === normalizeWhitespace(templateContent)) {
    return {
      hasChanges: false,
      mergedContent: currentContent,
      customizationRatio: 0,
    }
  }

  const merged = mergeSections(currentSections, templateSections)
  const customizationRatio = calculateCustomization(currentSections, templateSections)

  return {
    hasChanges: true,
    mergedContent: merged,
    customizationRatio,
  }
}

/**
 * 判断是否需要手动审查（用户自定义程度过高）
 */
export function needsManualReview(ratio: number): boolean {
  return ratio >= HEAVY_CUSTOMIZATION_THRESHOLD
}

/**
 * 将 Markdown 内容按二级标题分割为段落
 */
export function parseSections(content: string): Section[] {
  const lines = content.split('\n')
  const sections: Section[] = []
  let currentHeading = ''
  let currentLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // 保存前一个段落
      if (currentLines.length > 0 || currentHeading !== '') {
        sections.push({
          heading: currentHeading,
          content: currentLines.join('\n'),
        })
      }
      currentHeading = line.replace(/^## /, '').trim()
      currentLines = [line]
    } else {
      currentLines.push(line)
    }
  }

  // 保存最后一个段落
  if (currentLines.length > 0 || currentHeading !== '') {
    sections.push({
      heading: currentHeading,
      content: currentLines.join('\n'),
    })
  }

  return sections
}

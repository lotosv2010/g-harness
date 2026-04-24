import type { Section } from './diff-engine.js'

/**
 * 合并段落：模板段落用新版本，用户段落保留
 */
export function mergeSections(
  currentSections: Section[],
  templateSections: Section[],
): string {
  const templateMap = new Map<string, Section>()
  for (const s of templateSections) {
    templateMap.set(s.heading, s)
  }

  const currentMap = new Map<string, Section>()
  for (const s of currentSections) {
    currentMap.set(s.heading, s)
  }

  const mergedParts: string[] = []
  const processedHeadings = new Set<string>()

  // 按模板顺序处理模板中存在的段落
  for (const tplSection of templateSections) {
    processedHeadings.add(tplSection.heading)
    const currentSection = currentMap.get(tplSection.heading)

    if (!currentSection) {
      // 新增的模板段落，直接使用
      mergedParts.push(tplSection.content)
    } else if (isSectionUserModified(currentSection, tplSection)) {
      // 用户修改过的段落，保留用户版本
      mergedParts.push(currentSection.content)
    } else {
      // 未被用户修改，使用新模板版本
      mergedParts.push(tplSection.content)
    }
  }

  // 追加用户自行添加的段落（不在模板中的）
  for (const curSection of currentSections) {
    if (!processedHeadings.has(curSection.heading)) {
      mergedParts.push(curSection.content)
    }
  }

  return mergedParts.join('\n')
}

/**
 * 计算用户自定义程度（0~1）
 * 基于被修改段落数占总段落数的比例
 */
export function calculateCustomization(
  currentSections: Section[],
  templateSections: Section[],
): number {
  if (templateSections.length === 0) return 0

  const templateMap = new Map<string, Section>()
  for (const s of templateSections) {
    templateMap.set(s.heading, s)
  }

  let modifiedCount = 0
  let totalComparable = 0

  for (const cur of currentSections) {
    const tpl = templateMap.get(cur.heading)
    if (tpl) {
      totalComparable++
      if (isSectionUserModified(cur, tpl)) {
        modifiedCount++
      }
    }
  }

  // 用户新增的段落也算自定义
  const userOnlySections = currentSections.filter(
    (s) => !templateMap.has(s.heading),
  )
  modifiedCount += userOnlySections.length
  totalComparable += userOnlySections.length

  if (totalComparable === 0) return 0
  return modifiedCount / totalComparable
}

/**
 * 判断段落是否被用户修改过
 * 通过比较规范化后的内容是否不同来判断
 */
export function isSectionUserModified(
  currentSection: Section,
  templateSection: Section,
): boolean {
  const currentNorm = normalizeWhitespace(currentSection.content)
  const templateNorm = normalizeWhitespace(templateSection.content)
  return currentNorm !== templateNorm
}

/** 规范化空白字符，用于内容比较 */
export function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

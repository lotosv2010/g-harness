// 模板类别选择交互（init wizard 共用）
// 一级：类别列表，选择某个类别进入二级
// 二级：该类别下的子项多选，完成后回到一级
// 一级选"完成"时退出

import * as p from '@clack/prompts'
import pc from 'picocolors'
import {
  TEMPLATE_CATEGORIES,
  getRequiredCategoryIds,
  buildDefaultSelection,
} from '../template-categories.js'
import { isCancelled } from './init-shared.js'
import type { AgentDefinition } from '../agents/agent-registry.js'
import type { CategorySelectionMap, TemplateCategory } from '../template-categories.js'

export type { CategorySelectionMap }

const DONE_VALUE = '__done__'

/** 交互式类别选择（一级/二级循环） */
export async function askTemplateCategories(agents: AgentDefinition[]): Promise<CategorySelectionMap | null> {
  const hasClaude = agents.some((a) => a.id === 'claude')
  const requiredIds = new Set(getRequiredCategoryIds())

  const availableCategories = TEMPLATE_CATEGORIES
    .filter((cat) => {
      if (!hasClaude && (cat.id === 'skills' || cat.id === 'hooks')) return false
      return true
    })
    .sort((a, b) => a.order - b.order)

  // 初始化选择结果（默认值）
  const selection = buildDefaultSelection()

  while (true) {
    const choice = await showCategoryMenu(availableCategories, selection, requiredIds)
    if (choice === null) return null // Ctrl+C 取消整个 wizard
    if (choice === DONE_VALUE) break

    // 进入某个类别的二级选择
    const cat = availableCategories.find((c) => c.id === choice)
    if (!cat) continue

    const result = await showItemMenu(cat, selection)
    if (result === null) {
      // 二级取消 → 回到一级（不退出 wizard）
      continue
    }
    // 更新选择结果
    if (result.enabled) {
      selection[cat.id] = result.items
    } else {
      Reflect.deleteProperty(selection, cat.id)
    }
  }

  // 确保必选类别不被删除
  for (const reqId of requiredIds) {
    if (!(reqId in selection)) {
      const cat = TEMPLATE_CATEGORIES.find((c) => c.id === reqId)
      selection[reqId] = cat?.items.map((i) => i.id) ?? []
    }
  }

  return selection
}

/** 一级菜单：展示所有类别，标注已选/未选状态 */
async function showCategoryMenu(
  categories: TemplateCategory[],
  selection: CategorySelectionMap,
  requiredIds: Set<string>,
): Promise<string | null> {
  const options = categories.map((cat) => {
    const enabled = cat.id in selection
    const statusIcon = enabled ? pc.green('✓') : pc.dim('○')
    const itemCount = cat.items.length > 0
      ? ` [${(selection[cat.id] ?? []).length}/${cat.items.length}]`
      : ''
    const reqTag = requiredIds.has(cat.id) ? pc.yellow(' (必选)') : ''

    return {
      value: cat.id,
      label: `${statusIcon} ${cat.label}${reqTag}${pc.dim(itemCount)}`,
      hint: cat.description,
    }
  })

  options.push({
    value: DONE_VALUE,
    label: pc.bold(pc.cyan('→ 完成选择')),
    hint: '确认当前配置，继续下一步',
  })

  const picked = await p.select({
    message: '配置模板模块（选择类别进入详细配置，完成后选"完成选择"）',
    options,
  })
  if (isCancelled(picked)) return null
  return picked as string
}

interface ItemMenuResult {
  enabled: boolean
  items: string[]
}

/** 二级菜单：某个类别下的子项多选 */
async function showItemMenu(
  cat: TemplateCategory,
  selection: CategorySelectionMap,
): Promise<ItemMenuResult | null> {
  const currentlyEnabled = cat.id in selection

  // 无子项的类别：只做启用/禁用切换
  if (cat.items.length === 0) {
    if (cat.required) {
      p.log.info(`${cat.label} 为必选项，无法禁用`)
      return { enabled: true, items: [] }
    }
    const toggle = await p.confirm({
      message: `${currentlyEnabled ? '禁用' : '启用'} ${cat.label}？`,
      initialValue: !currentlyEnabled,
    })
    if (isCancelled(toggle)) return null
    return { enabled: toggle as boolean, items: [] }
  }

  // 有子项：multiselect
  const currentItems = selection[cat.id] ?? cat.items.filter((i) => i.defaultSelected).map((i) => i.id)
  const options = cat.items.map((item) => ({
    value: item.id,
    label: item.label,
    hint: item.description,
  }))

  const picked = await p.multiselect({
    message: `${cat.label} — 选择要安装的项目（全部取消 = 禁用该类别）`,
    options,
    required: false,
    initialValues: currentItems,
  })
  if (isCancelled(picked)) return null

  const ids = picked as string[]
  if (ids.length === 0 && !cat.required) {
    return { enabled: false, items: [] }
  }
  // 必选类别至少保留默认项
  if (ids.length === 0 && cat.required) {
    p.log.warn(`${cat.label} 为必选，已恢复默认选项`)
    return { enabled: true, items: cat.items.filter((i) => i.defaultSelected).map((i) => i.id) }
  }
  return { enabled: true, items: ids }
}

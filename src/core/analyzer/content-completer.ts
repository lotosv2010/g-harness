// 12 键模板变量补全（规则版） —— v0.2.0 单入口 completeContent()

import type { TemplateVariables, ProjectMeta } from '../commands/init-types.js'
import type { Preset } from '../preset-loader.js'
import type { ScanResult } from '../scanner/project-scanner.js'
import { analyzeDescription } from './description-analyzer.js'

export interface CompleteContentInput {
  meta: ProjectMeta
  scanResult: ScanResult
  preset: Preset | null
}

/**
 * 产出 12 键（+ preset 注入）的模板变量。
 * 此函数不依赖 LLM，失败必须降级到这里。
 */
export function completeContent(input: CompleteContentInput): TemplateVariables {
  const { meta, scanResult, preset } = input

  const description = meta.projectDescription || `${meta.projectName} 项目`
  const analysis = analyzeDescription(description)
  const techStackLines = composeTechStack(meta.techStackText, scanResult, preset)
  const architectureOverview = preset?.architecture?.overview
    ?? architectureFromAppType(analysis.appType)
  const modules = preset?.modules ?? defaultModulesFromAppType(analysis.appType)
  const moduleBreakdown = formatModuleBreakdown(modules)
  const projectStructure = preset?.architecture?.structure ?? defaultStructure(meta.srcDir)
  const codeStandards = formatCodeStandards(preset)
  const testStandards = formatTestStandards(scanResult, preset)
  const commands = formatCommands(preset)
  const initialFeatures = formatInitialFeatures(modules)
  const coreValue = `为 ${meta.projectName} 提供 ${description} 的核心能力`

  const base: TemplateVariables = {
    project_name: meta.projectName,
    project_description: description,
    tech_stack: techStackLines,
    architecture_overview: architectureOverview,
    module_breakdown: moduleBreakdown,
    project_structure: projectStructure,
    core_value: coreValue,
    initial_features: initialFeatures,
    code_standards: codeStandards,
    test_standards: testStandards,
    commands,
  }

  // 预设注入的目录变量
  if (preset?.variables) {
    for (const [key, value] of Object.entries(preset.variables)) {
      if (!(key in base)) base[key] = value
    }
  }

  return base
}

function composeTechStack(userInput: string, scan: ScanResult, preset: Preset | null): string {
  const bullets: string[] = []
  const userTokens = userInput
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const tok of userTokens) bullets.push(`- ${tok}`)

  const ts = preset?.techStack ?? {}
  const scanTs = scan.techStack
  const candidates: Array<[string, string | null | undefined]> = [
    ['语言', ts.language ?? scanTs.language],
    ['运行时', ts.runtime ?? scanTs.runtime],
    ['框架', ts.framework ?? scanTs.framework],
    ['构建工具', ts.buildTool ?? scanTs.buildTool],
    ['测试框架', ts.testRunner ?? scanTs.testRunner],
    ['包管理器', ts.packageManager ?? scanTs.packageManager],
  ]
  for (const [label, value] of candidates) {
    if (!value) continue
    const line = `- ${label}：${value}`
    if (!bullets.includes(line)) bullets.push(line)
  }
  return bullets.length > 0 ? bullets.join('\n') : '- （待补充）'
}

function architectureFromAppType(appType: string): string {
  switch (appType) {
    case 'frontend-spa':
      return 'Pages → Features → Components → Hooks → Shared'
    case 'frontend-ssr':
      return 'Routes/Pages（RSC） → Features → Components → Lib/Shared'
    case 'backend-api':
      return 'Controller → Service → Repository → Shared'
    case 'mobile':
      return 'Screens → Features → Components → Native 桥接 → Shared'
    case 'desktop':
      return 'Main Process + Renderer Process + Preload Bridge'
    case 'cli':
      return 'Entry → Commands → Core → Adapters'
    case 'library':
      return '公共 API → 内部实现 → 测试套件'
    case 'monorepo':
      return 'apps/* 部署入口 + packages/* 可复用库'
    default:
      return '按职责分层；模块边界单向依赖；关键路径可观测'
  }
}

function defaultModulesFromAppType(appType: string): string[] {
  switch (appType) {
    case 'frontend-spa':
      return ['pages', 'features', 'components', 'hooks', 'shared']
    case 'frontend-ssr':
      return ['app', 'components', 'features', 'lib']
    case 'backend-api':
      return ['routes', 'services', 'repositories', 'shared']
    case 'mobile':
      return ['screens', 'features', 'components', 'shared']
    case 'desktop':
      return ['main', 'preload', 'renderer', 'shared']
    case 'cli':
      return ['commands', 'core', 'adapters']
    case 'library':
      return ['src', 'tests']
    case 'monorepo':
      return ['apps', 'packages', 'tools']
    default:
      return ['core', 'shared']
  }
}

function formatModuleBreakdown(modules: string[]): string {
  if (modules.length === 0) return '- （待规划）'
  return modules
    .map((m) => `- \`${m}/\`：承担 ${m} 相关职责，保持单一职责与内聚边界`)
    .join('\n')
}

function defaultStructure(srcDir: string): string {
  return `${srcDir}/\n├── index.ts\n├── core/\n└── shared/`
}

function formatCodeStandards(preset: Preset | null): string {
  const defaults = [
    '单文件不超过 300 行；单函数不超过 40 行',
    '优先命名导出，避免默认导出',
    '所有对外 API 必须有类型签名与必要的注释',
    '异步错误必须被处理或显式向上传播',
  ]
  const presetRules = preset?.rules ?? []
  const merged = [...presetRules, ...defaults]
  return merged.map((r) => `- ${r}`).join('\n')
}

function formatTestStandards(scan: ScanResult, preset: Preset | null): string {
  const runner = preset?.techStack?.testRunner ?? scan.techStack.testRunner ?? 'Vitest'
  return [
    `- 测试框架：${runner}`,
    '- 关键路径 + 边界条件必须有单元测试',
    '- 新功能须附回归测试，Bug 修复须附复现测试',
    '- 覆盖率门槛：关键模块 ≥ 70%，整体 ≥ 60%',
  ].join('\n')
}

function formatCommands(preset: Preset | null): string {
  const cmds = preset?.commands ?? {}
  const entries = Object.entries(cmds)
  if (entries.length === 0) {
    return [
      '- 安装依赖：`<pm> install`',
      '- 开发：`<pm> dev`',
      '- 构建：`<pm> build`',
      '- 测试：`<pm> test`',
    ].join('\n')
  }
  return entries.map(([k, v]) => `- ${k}：\`${v}\``).join('\n')
}

function formatInitialFeatures(modules: string[]): string {
  if (modules.length === 0) return '- 功能 1：（待规划）'
  const features = modules.slice(0, 4).map(
    (m, i) => `- F${i + 1} ${m} — 描述该模块对用户的外部价值与主用例`,
  )
  while (features.length < 3) {
    features.push(`- F${features.length + 1} — （待规划）`)
  }
  return features.join('\n')
}

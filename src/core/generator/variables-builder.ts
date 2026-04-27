// 模板变量装配入口：将 ProjectMeta + ScanResult + Preset → TemplateVariables。

import { completeContent } from '../analyzer/content-completer.js'
import type { ProjectMeta, TemplateVariables } from '../commands/init-types.js'
import type { Preset } from '../preset-loader.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export interface BuildVariablesInput {
  meta: ProjectMeta
  scanResult: ScanResult
  preset: Preset | null
}

export function buildVariables(input: BuildVariablesInput): TemplateVariables {
  return completeContent(input)
}

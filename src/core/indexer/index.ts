// 项目索引器对外 API

import { parseRoutes } from './route-parser.js'
import { extractModules } from './module-extractor.js'
import { mapFeatures } from './feature-mapper.js'
import type { ProjectIndex } from './types.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export async function buildProjectIndex(
  rootDir: string,
  scan: ScanResult,
): Promise<ProjectIndex> {
  const [modules, routes] = await Promise.all([
    extractModules(rootDir, scan),
    parseRoutes(rootDir, scan),
  ])
  const features = mapFeatures(modules, routes)
  return {
    generatedAt: new Date().toISOString(),
    rootDir,
    modules,
    routes,
    features,
  }
}

export { parseRoutes } from './route-parser.js'
export { extractModules, extractExports } from './module-extractor.js'
export { mapFeatures } from './feature-mapper.js'
export { renderProjectMap, renderFeatures, renderRoutes } from './index-writer.js'
export { detectIndexDrift } from './index-drift.js'
export type { DriftReport, DriftItem } from './index-drift.js'
export type {
  ProjectIndex,
  ModuleEntry,
  ModuleKind,
  RouteEntry,
  RouteFramework,
  FeatureEntry,
} from './types.js'

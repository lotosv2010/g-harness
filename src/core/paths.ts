import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function getGForgeRoot(): string {
  const thisFile = fileURLToPath(import.meta.url)
  // src/core/paths.ts → 项目根目录（上两级）
  return join(dirname(thisFile), '..', '..')
}

// 模块抽取器 — 扫描源码目录，提取模块清单、入口文件、导出符号

import { readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { readDirSafe, isDirectory, fileExists } from '../fs-utils.js'
import type { ModuleEntry, ModuleKind } from './types.js'
import type { ScanResult } from '../scanner/project-scanner.js'

const ENTRY_CANDIDATES = ['index.ts', 'index.tsx', 'index.js', 'index.mjs', 'main.ts', 'main.js']
const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs']
const SKIP_DIRS = new Set(['node_modules', 'dist', '.next', '.nuxt', 'build', 'coverage', '.git', '__tests__'])

export async function extractModules(
  rootDir: string,
  scan: ScanResult,
): Promise<ModuleEntry[]> {
  const srcDir = scan.structure.srcDir ?? 'src'
  const srcRoot = join(rootDir, srcDir)
  if (!await isDirectory(srcRoot)) return []

  const entries = await readDirSafe(srcRoot)
  const modules: ModuleEntry[] = []

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(srcRoot, entry)
    const isDir = await isDirectory(full)

    if (isDir) {
      const m = await inspectModuleDir(full, entry, rootDir)
      if (m) modules.push(m)
    } else if (CODE_EXTS.some((e) => entry.endsWith(e)) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
      const m = await inspectModuleFile(full, entry, rootDir)
      if (m) modules.push(m)
    }
  }

  return modules
}

async function inspectModuleDir(
  dir: string,
  name: string,
  rootDir: string,
): Promise<ModuleEntry | null> {
  const entry = await findEntry(dir)
  const files = await countCodeFiles(dir)
  if (files === 0 && !entry) return null

  let exports: string[] = []
  if (entry) {
    const entryPath = join(dir, entry)
    exports = await extractExports(entryPath)
  }

  return {
    name,
    path: relative(rootDir, dir).replace(/\\/g, '/'),
    entry: entry ? `${relative(rootDir, join(dir, entry)).replace(/\\/g, '/')}` : undefined,
    exports,
    files: [`${files} 个代码文件`],
    kind: classifyModule(name),
  }
}

async function inspectModuleFile(
  file: string,
  name: string,
  rootDir: string,
): Promise<ModuleEntry | null> {
  const exports = await extractExports(file)
  if (exports.length === 0) return null
  const base = name.replace(/\.(tsx?|jsx?|mjs)$/, '')
  return {
    name: base,
    path: relative(rootDir, file).replace(/\\/g, '/'),
    entry: relative(rootDir, file).replace(/\\/g, '/'),
    exports,
    files: ['1 个文件'],
    kind: classifyModule(base),
  }
}

async function findEntry(dir: string): Promise<string | undefined> {
  for (const c of ENTRY_CANDIDATES) {
    if (await fileExists(join(dir, c))) return c
  }
  return undefined
}

async function countCodeFiles(dir: string): Promise<number> {
  let count = 0
  const stack: string[] = [dir]
  while (stack.length > 0) {
    const current = stack.pop() as string
    const entries = await readDirSafe(current)
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue
      const full = join(current, entry)
      let isDir: boolean
      try {
        isDir = (await stat(full)).isDirectory()
      } catch {
        continue
      }
      if (isDir) {
        stack.push(full)
      } else if (CODE_EXTS.some((e) => entry.endsWith(e)) && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
        count++
      }
    }
  }
  return count
}

export async function extractExports(file: string): Promise<string[]> {
  try {
    const content = await readFile(file, 'utf-8')
    const exports = new Set<string>()

    // export function/class/const/let/var/interface/type/enum Name
    const named = content.matchAll(/export\s+(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)
    for (const m of named) exports.add(m[1])

    // export { a, b as c }
    const listed = content.matchAll(/export\s*\{\s*([^}]+)\}/g)
    for (const m of listed) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim()
        if (name && name !== 'default') exports.add(name)
      }
    }

    // export default ...
    if (/export\s+default\b/.test(content)) exports.add('default')

    return [...exports].slice(0, 20)
  } catch {
    return []
  }
}

function classifyModule(name: string): ModuleKind {
  const lower = name.toLowerCase()
  if (/components?$/.test(lower)) return 'component'
  if (/services?$|api$/.test(lower)) return 'service'
  if (/utils?$|helpers?$|lib$/.test(lower)) return 'util'
  if (/shared|common|core/.test(lower)) return 'shared'
  if (/^(pages?|views?|screens?|modules?|features?)$/.test(lower)) return 'feature'
  return 'unknown'
}

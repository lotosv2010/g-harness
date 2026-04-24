// 路由解析器 — 支持 Next.js App/Pages Router、Nuxt、Express、React Router、Vue Router

import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileExists, readDirSafe, isDirectory } from '../fs-utils.js'
import type { RouteEntry, RouteFramework } from './types.js'
import type { ScanResult } from '../scanner/project-scanner.js'

export async function parseRoutes(
  rootDir: string,
  scan: ScanResult,
): Promise<RouteEntry[]> {
  const framework = scan.techStack.framework?.toLowerCase() ?? ''
  const routes: RouteEntry[] = []

  if (framework === 'next.js') {
    routes.push(...await parseNextApp(rootDir))
    routes.push(...await parseNextPages(rootDir))
  } else if (framework === 'nuxt') {
    routes.push(...await parseNuxtPages(rootDir))
  } else if (['express', 'hono', 'fastify'].includes(framework)) {
    routes.push(...await parseExpressLike(rootDir, scan))
  } else {
    // 尝试通用解析
    routes.push(...await parseReactRouter(rootDir, scan))
    routes.push(...await parseVueRouter(rootDir, scan))
  }

  return dedupe(routes)
}

// ── Next.js App Router ──

async function parseNextApp(rootDir: string): Promise<RouteEntry[]> {
  const candidates = [join(rootDir, 'app'), join(rootDir, 'src', 'app')]
  for (const appDir of candidates) {
    if (await isDirectory(appDir)) {
      return walkNextAppDir(appDir, appDir, rootDir, '')
    }
  }
  return []
}

async function walkNextAppDir(
  dir: string,
  appRoot: string,
  rootDir: string,
  routePrefix: string,
): Promise<RouteEntry[]> {
  const entries = await readDirSafe(dir)
  const out: RouteEntry[] = []

  for (const entry of entries) {
    const full = join(dir, entry)
    const isDir = await isDirectory(full)

    if (isDir) {
      // 跳过分组与私有目录
      if (entry.startsWith('_')) continue
      const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${normalizeNextSegment(entry)}`
      out.push(...await walkNextAppDir(full, appRoot, rootDir, routePrefix + segment))
      continue
    }

    if (/^page\.(tsx|jsx|ts|js)$/.test(entry)) {
      out.push({
        path: routePrefix || '/',
        file: relative(rootDir, full).replace(/\\/g, '/'),
        framework: 'next-app-router',
      })
    }

    if (/^route\.(ts|js)$/.test(entry)) {
      const methods = await extractNextRouteMethods(full)
      const fileRel = relative(rootDir, full).replace(/\\/g, '/')
      if (methods.length === 0) {
        out.push({ path: routePrefix || '/', file: fileRel, framework: 'next-app-router' })
      } else {
        for (const method of methods) {
          out.push({
            path: routePrefix || '/',
            method,
            file: fileRel,
            framework: 'next-app-router',
          })
        }
      }
    }
  }

  return out
}

function normalizeNextSegment(name: string): string {
  // [id] → :id ; [[...slug]] → :slug* ; [...slug] → :slug+
  if (name.startsWith('[[...') && name.endsWith(']]')) return `:${name.slice(5, -2)}*`
  if (name.startsWith('[...') && name.endsWith(']')) return `:${name.slice(4, -1)}+`
  if (name.startsWith('[') && name.endsWith(']')) return `:${name.slice(1, -1)}`
  return name
}

async function extractNextRouteMethods(file: string): Promise<string[]> {
  try {
    const content = await readFile(file, 'utf-8')
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
    return methods.filter((m) => new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\s*=`).test(content))
  } catch {
    return []
  }
}

// ── Next.js Pages Router ──

async function parseNextPages(rootDir: string): Promise<RouteEntry[]> {
  const candidates = [join(rootDir, 'pages'), join(rootDir, 'src', 'pages')]
  for (const pagesDir of candidates) {
    if (await isDirectory(pagesDir)) {
      return walkPagesDir(pagesDir, pagesDir, rootDir, '', 'next-pages-router')
    }
  }
  return []
}

async function walkPagesDir(
  dir: string,
  pagesRoot: string,
  rootDir: string,
  prefix: string,
  fw: RouteFramework,
): Promise<RouteEntry[]> {
  const entries = await readDirSafe(dir)
  const out: RouteEntry[] = []

  for (const entry of entries) {
    const full = join(dir, entry)
    const isDir = await isDirectory(full)
    if (isDir) {
      if (entry.startsWith('_')) continue
      const seg = `/${normalizeNextSegment(entry)}`
      out.push(...await walkPagesDir(full, pagesRoot, rootDir, prefix + seg, fw))
      continue
    }
    const match = entry.match(/^(.+)\.(tsx|jsx|ts|js|vue)$/)
    if (!match) continue
    const base = match[1]
    if (base.startsWith('_')) continue
    const segment = base === 'index' ? '' : `/${normalizeNextSegment(base)}`
    out.push({
      path: (prefix + segment) || '/',
      file: relative(rootDir, full).replace(/\\/g, '/'),
      framework: fw,
    })
  }

  return out
}

// ── Nuxt pages ──

async function parseNuxtPages(rootDir: string): Promise<RouteEntry[]> {
  const candidates = [join(rootDir, 'pages'), join(rootDir, 'src', 'pages')]
  for (const pagesDir of candidates) {
    if (await isDirectory(pagesDir)) {
      return walkPagesDir(pagesDir, pagesDir, rootDir, '', 'nuxt')
    }
  }
  return []
}

// ── Express / Hono / Fastify ──

const HANDLER_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'all']

async function parseExpressLike(rootDir: string, scan: ScanResult): Promise<RouteEntry[]> {
  const srcDir = scan.structure.srcDir ?? 'src'
  const root = join(rootDir, srcDir)
  if (!await isDirectory(root)) return []

  const files = await collectFiles(root, ['.ts', '.js', '.mjs'])
  const out: RouteEntry[] = []

  const methodsGroup = HANDLER_METHODS.join('|')
  const pattern = new RegExp(`\\b(?:app|router|server|api)\\s*\\.(${methodsGroup})\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'g')

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8')
      const lines = content.split(/\r?\n/)
      let match: RegExpExecArray | null
      pattern.lastIndex = 0
      while ((match = pattern.exec(content)) !== null) {
        const lineNo = content.slice(0, match.index).split(/\r?\n/).length
        out.push({
          path: match[2],
          method: match[1].toUpperCase(),
          file: relative(rootDir, file).replace(/\\/g, '/'),
          line: lineNo,
          handler: guessHandlerAt(lines, lineNo - 1),
          framework: 'express',
        })
      }
    } catch { /* ignore */ }
  }

  return out
}

function guessHandlerAt(lines: string[], idx: number): string | undefined {
  const window = lines.slice(idx, Math.min(lines.length, idx + 3)).join(' ')
  const m = window.match(/,\s*([A-Za-z_$][\w$]*)\s*\)/) || window.match(/=>\s*([A-Za-z_$][\w$]*)\s*\(/)
  return m?.[1]
}

// ── React Router（代码内定义） ──

async function parseReactRouter(rootDir: string, scan: ScanResult): Promise<RouteEntry[]> {
  if (!hasDep(scan, 'react-router') && !hasDep(scan, 'react-router-dom')) return []
  const srcDir = scan.structure.srcDir ?? 'src'
  const root = join(rootDir, srcDir)
  if (!await isDirectory(root)) return []

  const files = await collectFiles(root, ['.tsx', '.jsx', '.ts', '.js'])
  const out: RouteEntry[] = []
  const routePattern = /<Route\s+[^>]*path\s*=\s*['"`]([^'"`]+)['"`][^>]*(?:component|element)\s*=\s*\{([^}]+)\}/g
  const objectPattern = /\{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*(?:element|component):\s*([^,}]+)/g

  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8')
      const rel = relative(rootDir, file).replace(/\\/g, '/')
      let m: RegExpExecArray | null
      routePattern.lastIndex = 0
      while ((m = routePattern.exec(content)) !== null) {
        out.push({ path: m[1], file: rel, handler: m[2].trim(), framework: 'react-router' })
      }
      objectPattern.lastIndex = 0
      while ((m = objectPattern.exec(content)) !== null) {
        out.push({ path: m[1], file: rel, handler: m[2].trim().slice(0, 40), framework: 'react-router' })
      }
    } catch { /* ignore */ }
  }

  return out
}

// ── Vue Router ──

async function parseVueRouter(rootDir: string, scan: ScanResult): Promise<RouteEntry[]> {
  if (!hasDep(scan, 'vue-router')) return []
  const srcDir = scan.structure.srcDir ?? 'src'
  const root = join(rootDir, srcDir)
  if (!await isDirectory(root)) return []

  const files = await collectFiles(root, ['.ts', '.js'])
  const out: RouteEntry[] = []
  const pattern = /\{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*(?:component|name):\s*([^,}]+)/g

  for (const file of files) {
    const name = file.toLowerCase()
    if (!name.includes('router') && !name.includes('routes')) continue
    try {
      const content = await readFile(file, 'utf-8')
      const rel = relative(rootDir, file).replace(/\\/g, '/')
      let m: RegExpExecArray | null
      pattern.lastIndex = 0
      while ((m = pattern.exec(content)) !== null) {
        out.push({ path: m[1], file: rel, handler: m[2].trim().slice(0, 40), framework: 'vue-router' })
      }
    } catch { /* ignore */ }
  }

  return out
}

// ── 工具 ──

async function collectFiles(dir: string, exts: string[]): Promise<string[]> {
  const out: string[] = []
  const stack: string[] = [dir]
  const skip = new Set(['node_modules', 'dist', '.next', '.nuxt', 'build', 'coverage', '.git'])

  while (stack.length > 0) {
    const current = stack.pop() as string
    const entries = await readDirSafe(current)
    for (const entry of entries) {
      if (skip.has(entry)) continue
      const full = join(current, entry)
      if (await isDirectory(full)) {
        stack.push(full)
      } else if (exts.some((e) => entry.endsWith(e))) {
        out.push(full)
      }
    }
  }
  return out
}

function hasDep(scan: ScanResult, _dep: string): boolean {
  // ScanResult 未暴露原始 deps，这里只能基于 framework 判断
  // 保留此函数用于未来扩展
  const fw = scan.techStack.framework?.toLowerCase()
  return fw === 'react' || fw === 'vue'
}

async function pathExists(p: string): Promise<boolean> {
  return fileExists(p)
}

function dedupe(routes: RouteEntry[]): RouteEntry[] {
  const seen = new Set<string>()
  return routes.filter((r) => {
    const key = `${r.framework}|${r.method ?? ''}|${r.path}|${r.file}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// eslint 卫兵：保留 pathExists 导入路径的可见性
export const _internal = { pathExists }

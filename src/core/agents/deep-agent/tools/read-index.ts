// readIndex 工具：汇总项目"索引类"信号，供 Deep Agent 快速建立全局视图
//
// 查找优先级（命中即串联展示，尽可能在一次工具调用里给 agent 足够上下文）：
// 1. docs 下的索引：PROJECT_MAP.md / FEATURES.md / ROUTES.md / OVERVIEW.md / INDEX.md
// 2. 根级可读清单：README.md / README.zh-CN.md / AGENTS.md / CLAUDE.md
// 3. package.json（scripts / deps 摘要）或 pyproject.toml / Cargo.toml / go.mod
// 4. 路由 / 页面目录：routes/ route/ src/routes/ src/pages/ pages/ app/ src/app/ api/ src/api/
// 5. 以上全部缺失时，降级为根目录清单（剔除 node_modules / dist / .git 等）
//
// 注意：本工具只做只读汇总，不做深度扫描；文件大小截断到 4KB 防止 prompt 溢出。
/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ToolContext, ToolSpec } from './types.js'

/** 文档索引候选（优先级从高到低） */
const DOC_INDEX_FILES = [
  'docs/PROJECT_MAP.md',
  'docs/FEATURES.md',
  'docs/ROUTES.md',
  'docs/OVERVIEW.md',
  'docs/INDEX.md',
  'docs/ARCHITECTURE.md',
]

/** 根级可读清单 */
const ROOT_SUMMARY_FILES = [
  'README.md',
  'README.zh-CN.md',
  'README.zh.md',
  'AGENTS.md',
  'CLAUDE.md',
]

/** 元数据文件（提取 scripts / deps 摘要） */
const METADATA_FILES = [
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'composer.json',
  'pubspec.yaml',
]

/** 路由 / 页面 / 入口目录候选 */
const ROUTE_DIR_CANDIDATES = [
  'routes',
  'route',
  'src/routes',
  'src/route',
  'src/pages',
  'pages',
  'app',
  'src/app',
  'src/modules',
  'src/features',
  'api',
  'src/api',
  'controllers',
  'src/controllers',
]

const MAX_CHUNK_BYTES = 4 * 1024 // 单文件最多贴 4KB，防 prompt 膨胀

export function createReadIndexTool(ctx: ToolContext, z: any): ToolSpec {
  return {
    name: 'readIndex',
    description:
      '读取项目索引信号：优先 docs 索引 → README / AGENTS.md → package.json → routes/pages/app 目录。' +
      '找不到任何索引时回退到根目录清单，供 agent 后续抽样分析。',
    schema: z.object({}),
    handler: async () => {
      const chunks: string[] = []

      // 1) 文档索引
      for (const rel of DOC_INDEX_FILES) {
        const content = await tryReadTrimmed(ctx.targetDir, rel)
        if (content) chunks.push(`## ${rel}\n\n${content}`)
      }

      // 2) 根级 README / AGENTS
      for (const rel of ROOT_SUMMARY_FILES) {
        const content = await tryReadTrimmed(ctx.targetDir, rel)
        if (content) chunks.push(`## ${rel}\n\n${content}`)
      }

      // 3) 元数据摘要
      for (const rel of METADATA_FILES) {
        const summary = await summarizeMetadata(ctx.targetDir, rel)
        if (summary) chunks.push(summary)
      }

      // 4) 路由 / 页面目录
      const routeSummary = await summarizeRouteDirs(ctx.targetDir)
      if (routeSummary) chunks.push(routeSummary)

      // 5) 全都缺失 → 降级为根目录清单
      if (chunks.length === 0) {
        const rootListing = await shallowListRoot(ctx.targetDir)
        const hint =
          '（未发现任何索引文件或常见入口目录，建议据"用户输入的项目描述"先形成假设，再用 listDir / readFile 抽样验证）'
        return rootListing ? `${hint}\n\n## 根目录速览\n\n${rootListing}` : hint
      }

      return chunks.join('\n\n---\n\n')
    },
  }
}

async function tryReadTrimmed(root: string, rel: string): Promise<string | null> {
  try {
    const raw = await readFile(join(root, rel), 'utf-8')
    return raw.length > MAX_CHUNK_BYTES
      ? `${raw.slice(0, MAX_CHUNK_BYTES)}\n… （已截断，原文 ${raw.length} 字节）`
      : raw
  } catch {
    return null
  }
}

async function summarizeMetadata(root: string, rel: string): Promise<string | null> {
  const raw = await tryReadRaw(root, rel)
  if (!raw) return null

  // package.json：抽 scripts / deps keys / workspaces
  if (rel === 'package.json') {
    try {
      const pkg = JSON.parse(raw) as {
        name?: string
        version?: string
        description?: string
        scripts?: Record<string, string>
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
        workspaces?: string[] | { packages?: string[] }
      }
      const deps = Object.keys(pkg.dependencies ?? {})
      const devDeps = Object.keys(pkg.devDependencies ?? {})
      const lines = [
        `## ${rel}（摘要）`,
        '',
        `- 名称：${pkg.name ?? '(未命名)'}${pkg.version ? ` @ ${pkg.version}` : ''}`,
        pkg.description ? `- 描述：${pkg.description}` : null,
        pkg.scripts
          ? `- scripts：${Object.keys(pkg.scripts).slice(0, 20).join(', ')}`
          : null,
        deps.length > 0 ? `- dependencies（${deps.length}）：${deps.slice(0, 20).join(', ')}${deps.length > 20 ? ' …' : ''}` : null,
        devDeps.length > 0 ? `- devDependencies（${devDeps.length}）：${devDeps.slice(0, 20).join(', ')}${devDeps.length > 20 ? ' …' : ''}` : null,
        pkg.workspaces
          ? `- workspaces：${JSON.stringify(pkg.workspaces)}`
          : null,
      ].filter((s): s is string => !!s)
      return lines.join('\n')
    } catch {
      // 解析失败 → 退回原文截断
    }
  }

  // 其他 metadata 文件直接原文截断
  const trimmed = raw.length > MAX_CHUNK_BYTES
    ? `${raw.slice(0, MAX_CHUNK_BYTES)}\n… （已截断）`
    : raw
  return `## ${rel}\n\n\`\`\`\n${trimmed}\n\`\`\``
}

async function summarizeRouteDirs(root: string): Promise<string | null> {
  const found: Array<{ dir: string; entries: string[] }> = []
  for (const rel of ROUTE_DIR_CANDIDATES) {
    const abs = join(root, rel)
    try {
      const s = await stat(abs)
      if (!s.isDirectory()) continue
      const entries = await readdir(abs, { withFileTypes: true })
      const visible = entries
        .filter((e) => !shouldHide(e.name))
        .slice(0, 40)
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      if (visible.length > 0) found.push({ dir: rel, entries: visible })
    } catch {
      // 目录不存在
    }
  }
  if (found.length === 0) return null
  const lines = ['## 路由 / 入口目录']
  for (const f of found) {
    lines.push('', `### ${f.dir}/`, f.entries.map((e) => `- ${e}`).join('\n'))
  }
  return lines.join('\n')
}

async function shallowListRoot(root: string): Promise<string | null> {
  try {
    const entries = await readdir(root, { withFileTypes: true })
    const items = entries
      .filter((e) => !shouldHide(e.name))
      .slice(0, 60)
      .map((e) => (e.isDirectory() ? `📁 ${e.name}/` : `📄 ${e.name}`))
    return items.length > 0 ? items.join('\n') : null
  } catch {
    return null
  }
}

async function tryReadRaw(root: string, rel: string): Promise<string | null> {
  try {
    return await readFile(join(root, rel), 'utf-8')
  } catch {
    return null
  }
}

function shouldHide(name: string): boolean {
  return (
    name.startsWith('.env') ||
    name === 'node_modules' ||
    name === '.git' ||
    name === 'dist' ||
    name === 'coverage' ||
    name === '.next' ||
    name === '.turbo' ||
    name === '.cache' ||
    name === 'build' ||
    name === 'target'
  )
}

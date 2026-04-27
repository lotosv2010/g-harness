// 模板树遍历：从 src/templates/shared/ 收集所有模板文件（已按 .template 后缀清洗）

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

export interface TemplateFile {
  /** 相对 shared/ 根的路径，已去掉 .template 后缀；如 '.ai/rules/architecture.md' */
  outputPath: string
  /** 文件原始内容（含 {{var}} 占位符） */
  content: string
  /** 源绝对路径（调试用） */
  sourcePath: string
}

/** 去除 .template 后缀：foo.template.md → foo.md；.cursorrules.template → .cursorrules */
function stripTemplateSuffix(relPath: string): string {
  if (relPath.endsWith('.template.md')) return relPath.slice(0, -'.template.md'.length) + '.md'
  if (relPath.endsWith('.template.json')) return relPath.slice(0, -'.template.json'.length) + '.json'
  if (relPath.endsWith('.template')) return relPath.slice(0, -'.template'.length)
  return relPath
}

async function walk(root: string, current: string, out: string[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true })
  for (const ent of entries) {
    const full = join(current, ent.name)
    if (ent.isDirectory()) {
      await walk(root, full, out)
    } else if (ent.isFile()) {
      out.push(full)
    }
  }
}

/** 收集 shared/ 目录下所有模板（不含 per-agent entry） */
export async function collectTemplateFiles(harnessRoot: string): Promise<TemplateFile[]> {
  const sharedRoot = join(harnessRoot, 'src', 'templates', 'shared')
  try {
    await stat(sharedRoot)
  } catch {
    return []
  }
  const files: string[] = []
  await walk(sharedRoot, sharedRoot, files)

  const results: TemplateFile[] = []
  for (const abs of files) {
    const rel = relative(sharedRoot, abs).split(sep).join('/')
    const outputPath = stripTemplateSuffix(rel)
    const content = await readFile(abs, 'utf-8')
    results.push({ outputPath, content, sourcePath: abs })
  }
  return results.sort((a, b) => a.outputPath.localeCompare(b.outputPath))
}

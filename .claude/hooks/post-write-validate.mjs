#!/usr/bin/env node
// PostToolUse(Write|Edit) 钩子：校验写入文件是否符合规则

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

// 用 fd 0 读 stdin，跨平台兼容（Windows 不支持 /dev/stdin 路径）
const input = JSON.parse(readFileSync(0, 'utf-8'))
const filePath = input?.tool_input?.file_path || input?.tool_input?.path || ''

const warnings = []

if (filePath) {
  const abs = resolve(filePath)
  const name = basename(abs)

  // 规则 S001：禁止写入 .env 文件
  if (/^\.env/.test(name)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则 S001：禁止写入 .env 文件',
    }))
    process.exit(0)
  }

  // 规则 A001：代码不进 templates/，规范不进 core/
  if (abs.includes('src/templates/') && /\.(ts|js|tsx|jsx)$/.test(name) && !name.endsWith('.template.ts')) {
    warnings.push('边界警告 A001：src/templates/ 中不应包含 TypeScript 代码逻辑')
  }

  if (abs.includes('src/core/') && name.endsWith('.md')) {
    warnings.push('边界警告 A001：src/core/ 中不应包含规范 Markdown 文件')
  }

  // 规则 A002：templates 技术栈无关
  if (abs.includes('src/templates/shared/')) {
    try {
      const content = readFileSync(abs, 'utf-8')
      const frameworkMentions = content.match(/\b(React|Vue|Angular|Next\.js|Nuxt|Vite|Webpack)\b/g)
      if (frameworkMentions && !content.includes('{{')) {
        warnings.push(`边界警告 A002：shared 模板引用了具体框架名 (${frameworkMentions.join(', ')})`)
      }
    } catch { /* 文件可能还未写入完成 */ }
  }
}

if (warnings.length > 0) {
  console.log(JSON.stringify({
    decision: 'allow',
    reason: warnings.join('; '),
  }))
} else {
  console.log(JSON.stringify({ decision: 'allow' }))
}

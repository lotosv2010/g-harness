#!/usr/bin/env node
// PostToolUse(Write|Edit) 钩子：写入后校验文件合规性

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

// 用 fd 0 读 stdin，跨平台兼容（Windows 不支持 /dev/stdin 路径）
const input = JSON.parse(readFileSync(0, 'utf-8'))
const filePath = input?.tool_input?.file_path || input?.tool_input?.path || ''

const warnings = []

if (filePath) {
  const abs = resolve(filePath)
  const name = basename(abs)

  // 禁止写入 .env 文件
  if (/^\.env/.test(name)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则：禁止写入 .env 文件',
    }))
    process.exit(0)
  }

  // 文件大小检查（写入后）
  try {
    const content = readFileSync(abs, 'utf-8')
    const lines = content.split('\n').length
    if (lines > 300 && !/\.(test|spec|d)\.\w+$/.test(name) && !/\.config\./.test(name)) {
      warnings.push(`文件体积警告：${name} 超过 300 行 (${lines} 行)，建议拆分`)
    }
  } catch { /* 文件可能不可读 */ }
}

if (warnings.length > 0) {
  console.log(JSON.stringify({ decision: 'allow', reason: warnings.join('; ') }))
} else {
  console.log(JSON.stringify({ decision: 'allow' }))
}

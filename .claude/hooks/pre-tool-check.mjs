#!/usr/bin/env node
// PreToolUse 钩子：工具调用前的安全检查

import { readFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const toolName = input?.tool_name || ''
const toolInput = input?.tool_input || {}

// Bash 命令安全检查
if (toolName === 'Bash') {
  const cmd = toolInput.command || ''

  // S003：禁止无确认的 force push 到 main
  if (/git\s+push\s+.*--force/.test(cmd) && /\b(main|master)\b/.test(cmd)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则 S003：禁止 force push 到 main 分支',
    }))
    process.exit(0)
  }

  // S003：禁止 --no-verify
  if (/--no-verify/.test(cmd)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则 S003：禁止使用 --no-verify 跳过钩子',
    }))
    process.exit(0)
  }

  // S004：禁止全局安装未知包
  if (/npm\s+install\s+-g|pnpm\s+add\s+-g/.test(cmd)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则 S004：禁止全局安装包，请使用项目本地依赖',
    }))
    process.exit(0)
  }
}

// Write/Edit 文件路径安全检查
if (toolName === 'Write' || toolName === 'Edit') {
  const filePath = toolInput.file_path || toolInput.path || ''
  if (filePath) {
    const name = basename(filePath)
    // S001：禁止写入敏感文件
    if (/^\.env($|\.)/.test(name) || /\.(key|pem|p12)$/.test(name)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `安全规则 S001：禁止写入敏感文件 (${name})`,
      }))
      process.exit(0)
    }
  }
}

// 默认放行
console.log(JSON.stringify({ decision: 'allow' }))

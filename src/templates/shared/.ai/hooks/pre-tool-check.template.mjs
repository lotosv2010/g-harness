#!/usr/bin/env node
// PreToolUse 钩子：工具调用前的安全检查

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

// 用 fd 0 读 stdin，跨平台兼容（Windows 不支持 /dev/stdin 路径）
const input = JSON.parse(readFileSync(0, 'utf-8'))
const toolName = input?.tool_name || ''
const toolInput = input?.tool_input || {}

// Bash 命令安全检查
if (toolName === 'Bash') {
  const cmd = toolInput.command || ''

  // 禁止 force push 到 main
  if (/git\s+push\s+.*--force/.test(cmd) && /\b(main|master)\b/.test(cmd)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则：禁止 force push 到 main/master 分支',
    }))
    process.exit(0)
  }

  // 禁止 --no-verify
  if (/--no-verify/.test(cmd)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: '安全规则：禁止使用 --no-verify 跳过钩子',
    }))
    process.exit(0)
  }
}

// Write/Edit 敏感文件检查
if (toolName === 'Write' || toolName === 'Edit') {
  const filePath = toolInput.file_path || toolInput.path || ''
  if (filePath) {
    const name = basename(filePath)
    if (/^\.env($|\.)/.test(name) || /\.(key|pem|p12)$/.test(name)) {
      console.log(JSON.stringify({
        decision: 'block',
        reason: `安全规则：禁止写入敏感文件 (${name})`,
      }))
      process.exit(0)
    }
  }
}

console.log(JSON.stringify({ decision: 'allow' }))

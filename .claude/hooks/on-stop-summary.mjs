#!/usr/bin/env node
// Stop 钩子：Claude 停止响应时输出任务摘要提醒

import { readFileSync } from 'node:fs'

// 用 fd 0 读 stdin，跨平台兼容（Windows 不支持 /dev/stdin 路径）
const input = JSON.parse(readFileSync(0, 'utf-8'))
const reason = input?.stop_reason || 'unknown'

// Stop 钩子只做通知，不阻塞
const reminders = []

if (reason === 'end_turn') {
  reminders.push('如有未完成任务，记得更新 docs/tasks/BOARD.md')
}

if (reminders.length > 0) {
  console.log(JSON.stringify({
    decision: 'allow',
    reason: reminders.join('; '),
  }))
} else {
  console.log(JSON.stringify({ decision: 'allow' }))
}

#!/usr/bin/env node
// Stop 钩子：Claude 停止响应时的通知

import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const reason = input?.stop_reason || 'unknown'

const reminders = []

if (reason === 'end_turn') {
  reminders.push('如有未完成任务，记得更新任务看板')
}

if (reminders.length > 0) {
  console.log(JSON.stringify({ decision: 'allow', reason: reminders.join('; ') }))
} else {
  console.log(JSON.stringify({ decision: 'allow' }))
}

#!/usr/bin/env node
// Stop 事件钩子：验证协议是否完成所有阶段
// 通过检查会话 transcript 中的完成标志判断

import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const transcriptPath = input.transcript_path

if (!transcriptPath) process.exit(0)

let transcript
try {
  transcript = readFileSync(transcriptPath, 'utf-8')
} catch {
  process.exit(0)
}

// 检测当前使用的协议类型（通过 transcript 中的关键词）
const protocolPatterns = [
  {
    name: 'feature',
    trigger: /添加功能|实现功能|新增模块|feat/i,
    stages: ['阶段1-需求理解', '阶段2-方案确认', '阶段3-实现', '阶段4-验证'],
  },
  {
    name: 'bugfix',
    trigger: /bug|出错|不工作|异常|fix/i,
    stages: ['阶段1-定位', '阶段2-方案', '阶段3-修复', '阶段4-验证'],
  },
  {
    name: 'refactor',
    trigger: /重构|优化代码|清理|refactor/i,
    stages: ['阶段1-评估', '阶段2-方案确认', '阶段3-执行', '阶段4-验证'],
  },
  {
    name: 'review',
    trigger: /审查|review|检查代码/i,
    stages: ['维度1-正确性', '维度2-架构', '维度3-质量', '维度4-测试', '维度5-安全'],
  },
]

// 找到匹配的协议
const matched = protocolPatterns.find((p) => p.trigger.test(transcript))
if (!matched) process.exit(0)

// 检查是否有遗漏的阶段
const missing = matched.stages.filter((stage) => !transcript.includes(`✓ ${stage}`))

if (missing.length > 0) {
  const msg = `协议合规检查（${matched.name}）：以下阶段未完成:\n${missing.map((s) => `  - ${s}`).join('\n')}`
  console.log(JSON.stringify({
    decision: 'block',
    reason: msg,
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: `${msg}\n\n请完成遗漏的阶段后再结束。如果某阶段确实不适用，请明确标记跳过原因。`,
    },
  }))
  process.exit(2)
}

process.exit(0)

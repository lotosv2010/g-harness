#!/usr/bin/env node
// PostToolUse(Write|Edit) 边界检查钩子
// 校验写入文件是否符合架构规则（模块依赖方向、文件位置）

import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const { tool_input: toolInput, cwd } = input
const filePath = toolInput?.file_path ?? ''

if (!filePath) process.exit(0)

const relPath = relative(cwd, resolve(filePath)).replace(/\\/g, '/')
const content = toolInput?.content ?? toolInput?.new_string ?? ''
const violations = []

// 规则 1：共享模块不得导入业务模块
if (relPath.startsWith('src/shared/') || relPath.startsWith('src/common/') || relPath.startsWith('src/lib/')) {
  const importPattern = /(?:import|require)\s*\(?['"](?:\.\.\/)+(features|pages|views|app|modules)\//g
  if (importPattern.test(content)) {
    violations.push(`共享模块 ${relPath} 不应导入业务模块`)
  }
}

// 规则 2：功能模块间不得交叉导入
const featureMatch = relPath.match(/^src\/(?:features|modules)\/([^/]+)\//)
if (featureMatch) {
  const currentFeature = featureMatch[1]
  const crossImport = new RegExp(
    `(?:import|require)\\s*\\(?['"](?:\\.\\.\\/)+(features|modules)/(?!${currentFeature}/)`,
    'g'
  )
  if (crossImport.test(content)) {
    violations.push(`功能模块 ${currentFeature} 不应直接导入其他功能模块`)
  }
}

// 规则 3：非 API 层不得直接调用 HTTP
const apiDirs = ['src/api/', 'src/services/', 'src/service/']
const isApiLayer = apiDirs.some((d) => relPath.startsWith(d))
if (!isApiLayer && /\b(fetch|axios|http\.request|XMLHttpRequest)\s*\(/.test(content)) {
  if (!relPath.includes('.test.') && !relPath.includes('.spec.')) {
    violations.push(`${relPath} 不在 API 层，不应直接调用 HTTP`)
  }
}

if (violations.length > 0) {
  const msg = `边界检查违规:\n${violations.map((v) => `  - ${v}`).join('\n')}`
  console.log(JSON.stringify({
    decision: 'block',
    reason: msg,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `${msg}\n\n请修正上述违规后再继续。`,
    },
  }))
  process.exit(2)
}

process.exit(0)

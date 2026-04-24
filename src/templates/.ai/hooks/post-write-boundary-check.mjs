#!/usr/bin/env node
// PostToolUse(Write|Edit) 边界检查钩子
// 读取 .claude/guardrails/boundary-rules.json 中的规则进行校验

import { readFileSync, existsSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'

const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const { tool_input: toolInput, cwd } = input
const filePath = toolInput?.file_path ?? ''

if (!filePath) process.exit(0)

const relPath = relative(cwd, resolve(filePath)).replace(/\\/g, '/')
const content = toolInput?.content ?? toolInput?.new_string ?? ''
const violations = []

// 加载规则配置
const configPath = join(cwd, '.claude', 'guardrails', 'boundary-rules.json')
let rules = []
if (existsSync(configPath)) {
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))
    rules = config.rules ?? []
  } catch {
    // 配置解析失败，使用内置默认规则
    rules = getDefaultRules()
  }
} else {
  rules = getDefaultRules()
}

// 执行每条规则
for (const rule of rules) {
  switch (rule.id) {
    case 'B001':
      checkSharedIsolation(rule, relPath, content, violations)
      break
    case 'B002':
      checkFeatureIsolation(rule, relPath, content, violations)
      break
    case 'B003':
      checkHttpRestriction(rule, relPath, content, violations)
      break
  }
}

if (violations.length > 0) {
  const msg = `边界检查违规:\n${violations.map((v) => `  - [${v.id}] ${v.message}`).join('\n')}`
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

// --- 规则检查函数 ---

function checkSharedIsolation(rule, relPath, content, violations) {
  const inShared = (rule.sharedDirs ?? []).some((d) => relPath.startsWith(d))
  if (!inShared) return

  const forbidden = (rule.forbiddenImports ?? []).join('|')
  const pattern = new RegExp(`(?:import|require)\\s*\\(?['"](?:\\.\\.\\/)+(${forbidden})/`, 'g')
  if (pattern.test(content)) {
    violations.push({ id: rule.id, message: `${rule.name}：${relPath} 不应导入业务模块` })
  }
}

function checkFeatureIsolation(rule, relPath, content, violations) {
  const featureDirs = rule.featureDirs ?? ['src/features/', 'src/modules/']
  const dirPattern = featureDirs.map((d) => d.replace(/\/$/, '')).join('|')
  const match = relPath.match(new RegExp(`^(?:${dirPattern})/([^/]+)/`))
  if (!match) return

  const currentFeature = match[1]
  const crossPattern = new RegExp(
    `(?:import|require)\\s*\\(?['"](?:\\.\\.\\/)+(features|modules)/(?!${currentFeature}/)`,
    'g'
  )
  if (crossPattern.test(content)) {
    violations.push({ id: rule.id, message: `${rule.name}：${currentFeature} 不应导入其他功能模块` })
  }
}

function checkHttpRestriction(rule, relPath, content, violations) {
  const apiDirs = rule.apiDirs ?? []
  if (apiDirs.some((d) => relPath.startsWith(d))) return
  if (relPath.includes('.test.') || relPath.includes('.spec.')) return

  const patterns = (rule.httpPatterns ?? []).map((p) => new RegExp(`\\b${p}`, 'g'))
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      violations.push({ id: rule.id, message: `${rule.name}：${relPath} 不在 API 层，不应直接调用 HTTP` })
      break
    }
  }
}

function getDefaultRules() {
  return [
    {
      id: 'B001', name: '共享模块隔离',
      sharedDirs: ['src/shared/', 'src/common/', 'src/lib/'],
      forbiddenImports: ['features', 'pages', 'views', 'app', 'modules'],
    },
    {
      id: 'B002', name: '功能模块隔离',
      featureDirs: ['src/features/', 'src/modules/'],
    },
    {
      id: 'B003', name: 'HTTP 调用限制',
      apiDirs: ['src/api/', 'src/services/', 'src/service/'],
      httpPatterns: ['fetch\\s*\\(', 'axios', 'http\\.request', 'XMLHttpRequest'],
    },
  ]
}

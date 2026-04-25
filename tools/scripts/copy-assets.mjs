#!/usr/bin/env node
// 构建后置：把 TypeScript 不处理的资源（.md 等）复制到 dist/ 对应位置
// 当前仅涉及 Deep Agent 预设知识库

import { cp, mkdir, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const assets = [
  {
    from: 'src/core/agents/deep-agent/knowledge',
    to: 'dist/core/agents/deep-agent/knowledge',
    filter: (name) => name.endsWith('.md'),
  },
]

for (const asset of assets) {
  const src = resolve(root, asset.from)
  const dest = resolve(root, asset.to)

  try {
    await access(src)
  } catch {
    console.warn(`[copy-assets] skip missing ${asset.from}`)
    continue
  }

  await mkdir(dirname(dest), { recursive: true })
  await cp(src, dest, {
    recursive: true,
    filter: (source) => {
      if (!asset.filter) return true
      const seg = source.split(/[\\/]/).pop() ?? ''
      // 目录与白名单后缀都放行
      return seg.includes('.') ? asset.filter(seg) : true
    },
  })
  console.log(`[copy-assets] ${asset.from} → ${asset.to}`)
}

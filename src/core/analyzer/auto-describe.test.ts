import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { autoDescribe } from './auto-describe.js'

let workDir: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'auto-describe-'))
})

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true })
})

describe('autoDescribe', () => {
  it('空目录 → 返回全 null', async () => {
    const r = await autoDescribe(workDir)
    expect(r.projectName).toBeNull()
    expect(r.description).toBeNull()
    expect(r.sources).toEqual([])
  })

  it('仅有 package.json name → 提取 name，description 为 null', async () => {
    await writeFile(join(workDir, 'package.json'), JSON.stringify({ name: 'my-app' }))
    const r = await autoDescribe(workDir)
    expect(r.projectName).toBe('my-app')
    expect(r.description).toBeNull()
    expect(r.sources).toContain('package.json:name')
  })

  it('package.json 同时含 name 和 description → 均被提取', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ name: 'shop', description: '一个电商应用' }),
    )
    const r = await autoDescribe(workDir)
    expect(r.projectName).toBe('shop')
    expect(r.description).toBe('一个电商应用')
    expect(r.sources).toContain('package.json:name')
    expect(r.sources).toContain('package.json:description')
  })

  it('package.json 无 description 时 → README 首段作为兜底', async () => {
    await writeFile(join(workDir, 'package.json'), JSON.stringify({ name: 'demo' }))
    await writeFile(
      join(workDir, 'README.md'),
      '# Demo\n\n这是一个演示项目，用于测试 autoDescribe 的提取能力。\n\n## 安装\n\n...',
    )
    const r = await autoDescribe(workDir)
    expect(r.projectName).toBe('demo')
    expect(r.description).toContain('演示项目')
    expect(r.sources.some((s) => s.includes('README'))).toBe(true)
  })

  it('README 徽章与引用被跳过', async () => {
    await writeFile(
      join(workDir, 'README.md'),
      '# Title\n\n![badge](https://x.com/a.svg)\n\n> 引用块被跳过\n\n这是正文第一段。',
    )
    const r = await autoDescribe(workDir)
    expect(r.description).toBe('这是正文第一段。')
  })

  it('package.json description 优先于 README', async () => {
    await writeFile(
      join(workDir, 'package.json'),
      JSON.stringify({ description: '来自 package.json 的描述' }),
    )
    await writeFile(join(workDir, 'README.md'), '# T\n\n来自 README 的描述。')
    const r = await autoDescribe(workDir)
    expect(r.description).toBe('来自 package.json 的描述')
    expect(r.sources).toContain('package.json:description')
    expect(r.sources.every((s) => !s.includes('README'))).toBe(true)
  })

  it('超长 README 段落被截断到 280 字符', async () => {
    const long = '长'.repeat(400)
    await writeFile(join(workDir, 'README.md'), `# T\n\n${long}`)
    const r = await autoDescribe(workDir)
    expect(r.description).not.toBeNull()
    expect(r.description!.length).toBeLessThanOrEqual(280)
    expect(r.description!.endsWith('...')).toBe(true)
  })

  it('损坏的 package.json → 不抛错，返回 null', async () => {
    await writeFile(join(workDir, 'package.json'), '{ not valid json')
    const r = await autoDescribe(workDir)
    expect(r.projectName).toBeNull()
    expect(r.description).toBeNull()
  })
})

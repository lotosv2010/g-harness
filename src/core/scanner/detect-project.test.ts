import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectProject, resolveProjectMode } from './detect-project.js'
import { ProjectScanner } from './project-scanner.js'

describe('detectProject', () => {
  let tempDir: string
  const scanner = new ProjectScanner()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gforge-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('空目录返回 isEmpty=true', async () => {
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.isEmpty).toBe(true)
    expect(detection.hasPackageJson).toBe(false)
    expect(detection.hasGit).toBe(false)
    expect(detection.hasGForgeConfig).toBe(false)
    expect(detection.existingAgents).toEqual([])
  })

  it('仅有 .git 的目录仍为 isEmpty', async () => {
    await mkdir(join(tempDir, '.git'))
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.isEmpty).toBe(true)
  })

  it('有 package.json 的目录不为空', async () => {
    await writeFile(join(tempDir, 'package.json'), '{"name":"test"}')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.isEmpty).toBe(false)
    expect(detection.hasPackageJson).toBe(true)
  })

  it('检测到 .git 目录', async () => {
    await writeFile(join(tempDir, 'index.js'), '')
    await mkdir(join(tempDir, '.git'))
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.hasGit).toBe(true)
  })

  it('检测到 .cursorrules 返回 existingAgents 包含 cursor', async () => {
    await writeFile(join(tempDir, '.cursorrules'), 'rules')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.existingAgents).toContain('cursor')
  })

  it('检测到 CLAUDE.md 返回 existingAgents 包含 claude', async () => {
    await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.existingAgents).toContain('claude')
  })

  it('检测到多个 agent 配置', async () => {
    await writeFile(join(tempDir, 'CLAUDE.md'), '# Claude')
    await writeFile(join(tempDir, '.cursorrules'), 'rules')
    await writeFile(join(tempDir, '.windsurfrules'), 'rules')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.existingAgents).toContain('claude')
    expect(detection.existingAgents).toContain('cursor')
    expect(detection.existingAgents).toContain('windsurf')
  })

  it('从 AGENTS.md 检测 G-Forge 版本', async () => {
    await writeFile(join(tempDir, 'AGENTS.md'), '# AGENTS.md\n> 由 G-Forge v1.0.0 生成')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.gforgeVersion).toBe('1.0.0')
    expect(detection.hasGForgeConfig).toBe(true)
  })

  it('AGENTS.md 有 G-Forge 标记但无版本号返回 unknown', async () => {
    await writeFile(join(tempDir, 'AGENTS.md'), '# AGENTS.md\n> 由 G-Forge 生成')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.gforgeVersion).toBe('unknown')
  })

  it('无 AGENTS.md 返回 gforgeVersion=null', async () => {
    await writeFile(join(tempDir, 'index.js'), '')
    const scanResult = await scanner.scan(tempDir)
    const detection = await detectProject(tempDir, scanResult)
    expect(detection.gforgeVersion).toBeNull()
  })
})

describe('resolveProjectMode', () => {
  const baseScanResult = {
    techStack: { language: null, runtime: null, framework: null, buildTool: null, testRunner: null, packageManager: null },
    structure: { rootDir: '/tmp', isMonorepo: false, packages: [], srcDir: null },
    existingConfig: { hasClaudeMd: false, hasAgentsMd: false, hasEslint: false, hasTsConfig: false },
  }

  it('空目录返回 new', () => {
    const mode = resolveProjectMode({
      isEmpty: true, hasPackageJson: false, hasGit: false,
      hasGForgeConfig: false, gforgeVersion: null, existingAgents: [],
      scanResult: baseScanResult,
    })
    expect(mode).toBe('new')
  })

  it('已有 G-Forge 配置返回 reinit', () => {
    const mode = resolveProjectMode({
      isEmpty: false, hasPackageJson: true, hasGit: true,
      hasGForgeConfig: true, gforgeVersion: '1.0.0', existingAgents: ['claude'],
      scanResult: baseScanResult,
    })
    expect(mode).toBe('reinit')
  })

  it('普通已有项目返回 existing', () => {
    const mode = resolveProjectMode({
      isEmpty: false, hasPackageJson: true, hasGit: true,
      hasGForgeConfig: false, gforgeVersion: null, existingAgents: [],
      scanResult: baseScanResult,
    })
    expect(mode).toBe('existing')
  })
})

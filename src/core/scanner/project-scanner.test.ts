import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { ProjectScanner } from './project-scanner.js'

describe('ProjectScanner', () => {
  const scanner = new ProjectScanner()

  it('scans current g-forge project correctly', async () => {
    const rootDir = join(import.meta.dirname, '..', '..', '..')
    const result = await scanner.scan(rootDir)

    expect(result.techStack.language).toBe('TypeScript')
    expect(result.techStack.runtime).toBe('Node.js')
    expect(result.techStack.testRunner).toBe('Vitest')
    expect(result.techStack.packageManager).toBe('pnpm')

    expect(result.structure.srcDir).toBe('src')
    expect(result.structure.isMonorepo).toBe(false)

    expect(result.existingConfig.hasClaudeMd).toBe(true)
    expect(result.existingConfig.hasAgentsMd).toBe(true)
    expect(result.existingConfig.hasTsConfig).toBe(true)
  })

  it('handles empty directory', async () => {
    const fixturesDir = join(import.meta.dirname, '__fixtures__', 'empty-project')
    const result = await scanner.scan(fixturesDir)

    expect(result.techStack.language).toBeNull()
    expect(result.techStack.runtime).toBeNull()
    expect(result.techStack.framework).toBeNull()
    expect(result.structure.isMonorepo).toBe(false)
    expect(result.structure.packages).toHaveLength(0)
  })

  it('detects React framework', async () => {
    const fixturesDir = join(import.meta.dirname, '__fixtures__', 'react-project')
    const result = await scanner.scan(fixturesDir)

    expect(result.techStack.framework).toBe('React')
    expect(result.techStack.buildTool).toBe('Vite')
    expect(result.techStack.language).toBe('TypeScript')
  })
})

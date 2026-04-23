import { readFile, access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  detectLanguage,
  detectFramework,
  detectBuildTool,
  detectTestRunner,
} from './detect-tech.js'
import type { PackageJson } from './detect-tech.js'

export interface ScanResult {
  techStack: TechStack
  structure: ProjectStructure
  existingConfig: ExistingConfig
}

export interface TechStack {
  language: string | null
  runtime: string | null
  framework: string | null
  buildTool: string | null
  testRunner: string | null
  packageManager: string | null
}

export interface ProjectStructure {
  rootDir: string
  isMonorepo: boolean
  packages: string[]
  srcDir: string | null
}

export interface ExistingConfig {
  hasClaudeMd: boolean
  hasAgentsMd: boolean
  hasEslint: boolean
  hasTsConfig: boolean
}

export class ProjectScanner {
  async scan(rootDir: string): Promise<ScanResult> {
    const [techStack, structure, existingConfig] = await Promise.all([
      this.detectTechStack(rootDir),
      this.detectStructure(rootDir),
      this.detectExistingConfig(rootDir),
    ])

    return { techStack, structure, existingConfig }
  }

  private async detectTechStack(rootDir: string): Promise<TechStack> {
    const pkg = await this.readPackageJson(rootDir)

    return {
      language: detectLanguage(pkg),
      runtime: pkg ? 'Node.js' : null,
      framework: detectFramework(pkg),
      buildTool: detectBuildTool(pkg),
      testRunner: detectTestRunner(pkg),
      packageManager: await this.detectPackageManager(rootDir),
    }
  }

  private async detectPackageManager(rootDir: string): Promise<string | null> {
    const checks: Array<[string, string]> = [
      ['pnpm-lock.yaml', 'pnpm'],
      ['yarn.lock', 'yarn'],
      ['bun.lockb', 'bun'],
      ['package-lock.json', 'npm'],
    ]

    for (const [file, manager] of checks) {
      if (await this.fileExists(join(rootDir, file))) return manager
    }
    return null
  }

  private async detectStructure(rootDir: string): Promise<ProjectStructure> {
    const isMonorepo = await this.checkMonorepo(rootDir)
    const packages = isMonorepo ? await this.findWorkspacePackages(rootDir) : []
    const srcDir = await this.findSrcDir(rootDir)

    return { rootDir, isMonorepo, packages, srcDir }
  }

  private async checkMonorepo(rootDir: string): Promise<boolean> {
    const pkg = await this.readPackageJson(rootDir)
    if (pkg?.workspaces) return true
    if (await this.fileExists(join(rootDir, 'pnpm-workspace.yaml'))) return true
    if (await this.fileExists(join(rootDir, 'lerna.json'))) return true
    return false
  }

  private async findWorkspacePackages(rootDir: string): Promise<string[]> {
    const candidates = ['packages', 'apps', 'libs']
    const found: string[] = []

    for (const dir of candidates) {
      const fullPath = join(rootDir, dir)
      if (await this.fileExists(fullPath)) {
        try {
          const entries = await readdir(fullPath, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory()) {
              found.push(`${dir}/${entry.name}`)
            }
          }
        } catch {
          // 忽略读取错误
        }
      }
    }
    return found
  }

  private async findSrcDir(rootDir: string): Promise<string | null> {
    const candidates = ['src', 'lib', 'app']
    for (const dir of candidates) {
      if (await this.fileExists(join(rootDir, dir))) return dir
    }
    return null
  }

  private async detectExistingConfig(rootDir: string): Promise<ExistingConfig> {
    const [hasClaudeMd, hasAgentsMd, hasEslint, hasTsConfig] = await Promise.all([
      this.fileExists(join(rootDir, 'CLAUDE.md')),
      this.fileExists(join(rootDir, 'AGENTS.md')),
      this.hasEslintConfig(rootDir),
      this.fileExists(join(rootDir, 'tsconfig.json')),
    ])

    return { hasClaudeMd, hasAgentsMd, hasEslint, hasTsConfig }
  }

  private async hasEslintConfig(rootDir: string): Promise<boolean> {
    const candidates = [
      'eslint.config.js',
      'eslint.config.mjs',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
    ]
    for (const file of candidates) {
      if (await this.fileExists(join(rootDir, file))) return true
    }
    return false
  }

  private async readPackageJson(rootDir: string): Promise<PackageJson | null> {
    try {
      const content = await readFile(join(rootDir, 'package.json'), 'utf-8')
      return JSON.parse(content) as PackageJson
    } catch {
      return null
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }
}

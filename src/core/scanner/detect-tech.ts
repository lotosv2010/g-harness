export interface PackageJson {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  workspaces?: string[]
}

function getAllDeps(pkg: PackageJson): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies }
}

export function detectLanguage(pkg: PackageJson | null): string | null {
  if (!pkg) return null
  return 'typescript' in getAllDeps(pkg) ? 'TypeScript' : 'JavaScript'
}

export function detectFramework(pkg: PackageJson | null): string | null {
  if (!pkg) return null
  const allDeps = getAllDeps(pkg)

  const frameworks: Array<[string, string]> = [
    ['next', 'Next.js'],
    ['nuxt', 'Nuxt'],
    ['react', 'React'],
    ['vue', 'Vue'],
    ['@angular/core', 'Angular'],
    ['svelte', 'Svelte'],
    ['express', 'Express'],
    ['hono', 'Hono'],
    ['fastify', 'Fastify'],
  ]

  for (const [dep, name] of frameworks) {
    if (dep in allDeps) return name
  }
  return null
}

export function detectBuildTool(pkg: PackageJson | null): string | null {
  if (!pkg) return null
  const allDeps = getAllDeps(pkg)

  if ('vite' in allDeps) return 'Vite'
  if ('webpack' in allDeps) return 'Webpack'
  if ('esbuild' in allDeps) return 'esbuild'
  if ('rollup' in allDeps) return 'Rollup'
  if ('next' in allDeps) return 'Next.js (built-in)'
  return null
}

export function detectTestRunner(pkg: PackageJson | null): string | null {
  if (!pkg) return null
  const allDeps = getAllDeps(pkg)

  if ('vitest' in allDeps) return 'Vitest'
  if ('jest' in allDeps) return 'Jest'
  if ('mocha' in allDeps) return 'Mocha'
  return null
}

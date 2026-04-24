import { readFile, writeFile, mkdir, access, chmod } from 'node:fs/promises'
import { join } from 'node:path'

interface HookInstallResult {
  installed: boolean
  skipped: boolean
  reason?: string
}

// 安装 git pre-commit hook 到目标项目
export async function installPreCommitHook(
  gforgeRoot: string,
  targetDir: string,
  options: { overwrite: boolean; dryRun: boolean },
): Promise<HookInstallResult> {
  const gitHooksDir = join(targetDir, '.git', 'hooks')
  const hookTarget = join(gitHooksDir, 'pre-commit')

  // 检查 .git 目录是否存在
  if (!(await pathExists(join(targetDir, '.git')))) {
    return { installed: false, skipped: true, reason: '非 Git 仓库，跳过 pre-commit hook 安装' }
  }

  // 检查是否已存在 pre-commit hook
  if ((await pathExists(hookTarget)) && !options.overwrite) {
    return { installed: false, skipped: true, reason: 'pre-commit hook 已存在，使用 --force 覆盖' }
  }

  if (options.dryRun) {
    return { installed: true, skipped: false }
  }

  const hookSource = join(gforgeRoot, 'src', 'templates', 'git-hooks', 'pre-commit.sh')
  const content = await readFile(hookSource, 'utf-8')

  await mkdir(gitHooksDir, { recursive: true })
  await writeFile(hookTarget, content, { mode: 0o755 })

  // 跨平台：Windows 上 chmod 可能无效，但不影响功能
  try {
    await chmod(hookTarget, 0o755)
  } catch {
    // Windows 环境忽略 chmod 错误
  }

  return { installed: true, skipped: false }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

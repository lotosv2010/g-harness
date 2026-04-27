# API 契约定义

> 定义 G-Harness CLI 工具的命令接口和 Node.js API 规格。
> AI 在开发 CLI 命令时必须参考本文件。

---

## 1. CLI 命令接口

### 1.1 g-harness init

初始化 G-Harness 规范到目标项目中。

```bash
g-harness init [options]

选项：
  --preset <name>       使用预设（nextjs | nuxt | nestjs | vite-vue | vite-react | electron | tauri | react-native | miniprogram | vanilla | base）
  --scan                扫描已有项目结构并生成匹配的配置
  --dry-run             仅预览将生成的文件，不实际写入
  --force               覆盖已有配置文件
  --full                输出完整文档体系（默认仅输出核心层）

示例：
  g-harness init --preset vite-react
  g-harness init --scan
  g-harness init --dry-run
  g-harness init --full              # 输出全部文件（含护栏、技能、Prompt、扩展文档）
```

**行为规格：**

```yaml
输入：
  - 当前工作目录（或 --path 指定）
  - 命令行参数

处理：
  1. Scanner 扫描目标项目
  2. 加载预设（src/presets/<name>/preset.json）
  3. 加载可分发内容（src/templates/）
  4. Generator 渲染模板（{{variable}} → 预设变量值）
  5. 根据 --full 标志过滤核心/完整文件集
  6. 安装 git pre-commit hook（如 .git/ 存在）

输出（默认核心层）：
  - CLAUDE.md
  - AGENTS.md
  - .claude/rules/*.md
  - .claude/protocols/*.md
  - .claude/hooks/*.mjs（边界检查脚本）
  - .claude/settings.json（hook 注册配置）
  - docs/ARCHITECTURE.md
  - docs/SPEC.md
  - .git/hooks/pre-commit（校验闸门）

输出（--full 追加）：
  - .claude/guardrails/*.md
  - .claude/prompts/*.md
  - .claude/skills/**/*.md
  - docs/（DESIGN、API、DATA_MODEL、decisions、tasks、team、runbooks）
  - tools/、tests/ 基础结构

副作用：
  - 创建文件（不修改已有文件，除非 --force）
  - 安装 git pre-commit hook（不修改已有 hook，除非 --force）
  - 不安装依赖
  - 不修改 package.json

退出码：
  0 — 成功
  1 — 初始化失败
  2 — 参数错误
```

### 1.2 g-harness validate

校验目标项目是否符合 G-Harness 规则。

```bash
g-harness validate [options]

选项：
  --fix                 自动修复可修复的违规（R001、R002、R003）
  --rule <id>           仅检查指定规则
  --format <format>     输出格式（text | json），默认 text
  --severity <level>    最低报告级别（error | warning），默认 warning

可自动修复的规则：
  R001  @ts-ignore → @ts-expect-error
  R002  export default → 命名导出（function/class）
  R003  空 catch 块 → 添加 TODO 注释

示例：
  g-harness validate
  g-harness validate --fix
  g-harness validate --format json --severity error
```

### 1.3 g-harness check

轻量级增量校验，只检查 git diff 变更文件。

```bash
g-harness check [options]

选项：
  --staged              仅检查暂存区文件（git diff --cached）
  --format <format>     输出格式（text | json），默认 text

示例：
  g-harness check                    # 检查工作区变更
  g-harness check --staged           # 检查暂存区变更
  g-harness check --format json      # JSON 输出
```

### 1.4 g-harness context

管理 CLAUDE.md 上下文文件，确保与项目实际结构一致。

```bash
g-harness context <subcommand>

子命令：
  sync                  扫描项目结构，自动更新 CLAUDE.md 中的技术栈和模块地图
  check                 检查 CLAUDE.md 是否与代码结构一致，报告不一致项

示例：
  g-harness context sync             # 自动更新 CLAUDE.md
  g-harness context check            # 检查一致性
```

**检查项：**
- 技术栈信息（语言、框架、包管理器）是否与实际依赖匹配
- 模块地图是否反映 src/ 目录结构
- 引用的文件路径是否存在

### 1.5 g-harness migrate

规范版本升级时迁移目标项目的 G-Harness 配置文件。

```bash
g-harness migrate [options]

选项：
  --from <version>      源版本（省略则自动检测）
  --to <version>        目标版本（默认使用当前 G-Harness 版本）
  --dry-run             仅预览迁移方案

示例：
  g-harness migrate --from 0.1 --to 0.2
  g-harness migrate --dry-run
```

---

## 2. Node.js API

### 2.1 项目扫描

```typescript
import { ProjectScanner } from 'g-harness'

interface ScanResult {
  techStack: TechStack
  structure: ProjectStructure
  existingConfig: ExistingConfig
}

const scanner = new ProjectScanner()
const result: ScanResult = await scanner.scan('/path/to/project')
```

### 2.2 文件生成

```typescript
import { FileGenerator, ProjectScanner, loadPreset, getHarnessRoot } from 'g-harness'

const harnessRoot = getHarnessRoot()
const scanner = new ProjectScanner()
const scanResult = await scanner.scan('/path/to/project')
const preset = await loadPreset(harnessRoot, 'vite-react')

const generator = new FileGenerator()
const result = await generator.generate({
  harnessRoot,
  preset,
  targetDir: '/path/to/project',
  scanResult,
  overwrite: false,
  dryRun: false,
  full: false,  // true = 输出完整文档体系
})
```

### 2.3 规范校验

```typescript
import { RuleValidator } from 'g-harness'

const validator = new RuleValidator()
const result = await validator.validate('/path/to/project', {
  severity: 'warning',  // 可选：'error' | 'warning'
  ruleId: 'R005',       // 可选：仅检查指定规则
})
```

### 2.4 配置迁移

```typescript
import { ConfigMigrator } from 'g-harness'

interface MigrateResult {
  migrated: string[]
  manualRequired: string[]
}

const migrator = new ConfigMigrator()
const result: MigrateResult = await migrator.migrate({
  targetDir: '/path/to/project',
  fromVersion: '0.1',
  toVersion: '0.2',
})
```

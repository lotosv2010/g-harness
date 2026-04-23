# API 契约定义

> 定义 G-Forge CLI 工具的命令接口和 Node.js API 规格。
> AI 在开发 CLI 命令时必须参考本文件。

---

## 1. CLI 命令接口

### 1.1 gforge init

初始化 G-Forge 规范到目标项目中。

```bash
gforge init [options]

选项：
  --preset <name>       使用预设（react-vite | vue-nuxt | node-api | base）
  --scan                扫描已有项目结构并生成匹配的配置
  --dry-run             仅预览将生成的文件，不实际写入
  --force               覆盖已有配置文件

示例：
  gforge init --preset react-vite
  gforge init --scan
  gforge init --dry-run
```

**行为规格：**

```yaml
输入：
  - 当前工作目录（或 --path 指定）
  - 命令行参数

处理：
  1. Scanner 扫描目标项目
  2. 加载预设（presets/<name>/preset.json）
  3. 加载模板（templates/*.template.md）+ 通用规范（core/）
  4. Generator 渲染模板（{{variable}} → 预设变量值）

输出：
  - CLAUDE.md
  - AGENTS.md
  - .claude/rules/*.md
  - .claude/protocols/*.md
  - .claude/guardrails/*.md（可选）
  - docs/ 基础结构（可选）

副作用：
  - 创建文件（不修改已有文件，除非 --force）
  - 不安装依赖
  - 不修改 package.json

退出码：
  0 — 成功
  1 — 初始化失败
  2 — 参数错误
```

### 1.2 gforge validate

校验目标项目是否符合 G-Forge 规则。

```bash
gforge validate [options]

选项：
  --fix                 自动修复可修复的违规
  --rule <id>           仅检查指定规则
  --format <format>     输出格式（text | json），默认 text
  --severity <level>    最低报告级别（error | warning），默认 warning

示例：
  gforge validate
  gforge validate --fix
  gforge validate --format json --severity error
```

### 1.3 gforge context

管理 CLAUDE.md 上下文文件。

```bash
gforge context <subcommand>

子命令：
  sync                  分析项目结构，更新所有 CLAUDE.md
  check                 检查 CLAUDE.md 是否与代码结构一致

示例：
  gforge context sync
  gforge context check
```

### 1.4 gforge migrate

规范版本升级时迁移配置文件。

```bash
gforge migrate [options]

选项：
  --from <version>      源版本
  --to <version>        目标版本
  --dry-run             仅预览迁移方案

示例：
  gforge migrate --from 0.1 --to 0.2
  gforge migrate --dry-run
```

---

## 2. Node.js API

### 2.1 项目扫描

```typescript
import { ProjectScanner } from 'gforge'

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
import { FileGenerator } from 'gforge'

interface GenerateResult {
  created: string[]
  skipped: string[]
  overwritten: string[]
}

const generator = new FileGenerator()
const result: GenerateResult = await generator.generate({
  preset: 'react-vite',
  targetDir: '/path/to/project',
  variables: { /* 预设变量 */ },
  overwrite: false,
})
```

### 2.3 规范校验

```typescript
import { RuleValidator } from 'gforge'

interface ValidationResult {
  passed: boolean
  violations: Violation[]
  warnings: Warning[]
}

const validator = new RuleValidator()
const result: ValidationResult = await validator.validate('/path/to/project')
```

### 2.4 配置迁移

```typescript
import { ConfigMigrator } from 'gforge'

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

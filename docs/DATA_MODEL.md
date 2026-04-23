# 数据模型规格

> 定义 G-Forge 核心数据结构。
> AI 在创建或修改数据相关代码时必须参考本文件。

---

## 1. 扫描结果模型

### 1.1 ScanResult — 项目扫描结果

```typescript
interface ScanResult {
  techStack: TechStack
  structure: ProjectStructure
  existingConfig: ExistingConfig
}

interface TechStack {
  language: string                    // 'TypeScript' | 'JavaScript' | 'Python' | ...
  runtime: string                     // 'Node.js 20+' | 'Bun' | ...
  framework: string | null            // 'React' | 'Vue' | 'Next.js' | null
  buildTool: string | null            // 'Vite' | 'Webpack' | null
  testRunner: string | null           // 'Vitest' | 'Jest' | 'Pytest' | null
  packageManager: string | null       // 'pnpm' | 'npm' | 'yarn' | null
}

interface ProjectStructure {
  rootDir: string
  isMonorepo: boolean
  packages: string[]                  // monorepo 子包路径
  srcDir: string | null               // 源码目录
}

interface ExistingConfig {
  hasClaudeMd: boolean
  hasAgentsMd: boolean
  hasEslint: boolean
  hasTsConfig: boolean
}
```

---

## 2. 预设模型

### 2.1 Preset — 预设定义

```typescript
interface Preset {
  name: string                        // 'react-vite' | 'vue-nuxt' | 'node-api'
  description: string
  techStack: TechStack
  variables: Record<string, string>   // 模板变量映射
  codeStyle: string[]                 // 代码风格规则
  commands: Record<string, string>    // 常用命令
}
```

对应文件：`presets/<name>/preset.json`

---

## 3. 规则模型

### 3.1 Rule — 规则定义

```typescript
interface Rule {
  id: string                          // 'S001' | 'R003' | 'A002'
  severity: 'error' | 'warning'
  description: string
  category: 'safety' | 'code-quality' | 'architecture'
}
```

### 3.2 Violation — 违规记录

```typescript
interface Violation {
  ruleId: string
  severity: 'error' | 'warning'
  file: string
  line: number | null
  message: string
}
```

### 3.3 ValidationResult — 校验结果

```typescript
interface ValidationResult {
  passed: boolean
  violations: Violation[]
  warnings: Warning[]
}

interface Warning {
  ruleId: string
  file: string
  message: string
}
```

---

## 4. 生成结果模型

### 4.1 GenerateOptions / GenerateResult

```typescript
interface GenerateOptions {
  preset: string
  targetDir: string
  variables: Record<string, string>
  overwrite: boolean
}

interface GenerateResult {
  created: string[]                   // 新创建的文件
  skipped: string[]                   // 已存在而跳过的文件
  overwritten: string[]               // 被覆盖的文件
}
```

### 4.2 MigrateOptions / MigrateResult

```typescript
interface MigrateOptions {
  targetDir: string
  fromVersion: string
  toVersion: string
}

interface MigrateResult {
  migrated: string[]                  // 自动迁移的文件
  manualRequired: string[]            // 需手动处理的文件
}
```

---

## 5. 持久化方案

所有数据以文件形式存储，不使用数据库：

| 数据 | 格式 | 路径（目标项目中） |
|------|------|-------------------|
| 上下文 | Markdown | `CLAUDE.md`、`AGENTS.md` |
| 规则 | Markdown | `.claude/rules/*.md` |
| 协议 | Markdown | `.claude/protocols/*.md` |
| 护栏 | Markdown | `.claude/guardrails/*.md` |
| ADR | Markdown + frontmatter | `docs/decisions/*.md` |

---

## 6. 数据流

```
gforge init --preset react-vite
         │
         ▼
   Scanner.scan(targetDir)
         │ → ScanResult
         ▼
   加载 Preset（presets/react-vite/preset.json）
         │ → Preset
         ▼
   Generator.generate({ preset, targetDir, variables })
         │ → GenerateResult
         ▼
   输出文件到目标项目
```

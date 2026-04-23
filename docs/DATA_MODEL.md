# 数据模型规格

> 定义 G-Forge 核心数据结构与持久化模型。
> AI 在创建或修改数据相关代码时必须参考本文件。

---

## 1. 核心配置模型

### 1.1 GForgeConfig — 主配置

```typescript
interface GForgeConfig {
  version: string;                    // 配置版本号
  preset: string;                     // 使用的预设名称

  project: {
    name: string;                     // 项目名称
    description: string;              // 项目描述
    language: 'TypeScript' | 'JavaScript';
    framework: 'React' | 'Vue' | 'Next' | 'Nuxt' | 'Angular';
  };

  context: {
    auto_sync: boolean;               // 自动同步 CLAUDE.md
    glossary: string;                 // 术语表路径
    decisions_dir: string;            // ADR 目录路径
    patterns_dir: string;             // 模式库目录路径
  };

  conventions: {
    naming: string;                   // 命名约定文件路径
    imports: {
      order: string[];                // 导入排序规则
      alias: Record<string, string>;  // 路径别名
    };
  };

  rules: {
    enabled: string[];                // 启用的规则集
    custom_dir: string;               // 自定义规则目录
  };

  templates: {
    dir: string;                      // 模板目录
    overrides: Record<string, string>; // 模板覆盖映射
  };

  workflows: {
    default: string;                  // 默认工作流
    available: string[];              // 可用工作流列表
  };

  hooks: {
    validate_on_write: boolean;       // 写入时校验
    enhance_prompts: boolean;         // 提示词增强
    pre_commit_check: boolean;        // 提交前检查
  };
}
```

### 1.2 Rule — 规则定义

```typescript
interface Rule {
  id: string;                         // 唯一标识，如 "no-cross-feature-import"
  severity: 'error' | 'warning' | 'info';
  description: string;                // 规则描述
  pattern: string;                    // 应用于哪些文件（glob）
  disallow_imports_from?: string;     // 禁止导入来源
  disallow_patterns?: string[];       // 禁止出现的代码模式（正则）
  suggestion?: string;                // 违规时的建议
  fixable?: boolean;                  // 是否可自动修复
}

interface RuleSet {
  name: string;                       // 规则集名称
  rules: Rule[];
}
```

### 1.3 Violation — 违规记录

```typescript
interface Violation {
  ruleId: string;                     // 违反的规则 ID
  severity: 'error' | 'warning' | 'info';
  message: string;                    // 违规说明
  file: string;                       // 违规文件路径
  line?: number;                      // 行号
  column?: number;                    // 列号
  suggestion?: string;                // 修复建议
  autoFixable: boolean;               // 是否可自动修复
}

interface ValidationResult {
  valid: boolean;
  timestamp: string;                  // ISO 8601
  duration: number;                   // 毫秒
  violations: Violation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    filesScanned: number;
  };
}
```

---

## 2. 模板模型

### 2.1 Template — 模板定义

```typescript
interface Template {
  name: string;                       // 模板名称
  type: 'feature' | 'component' | 'hook' | 'api' | 'store';
  description: string;
  files: TemplateFile[];              // 生成的文件列表
  variables: TemplateVariable[];      // 模板变量
}

interface TemplateFile {
  path: string;                       // 输出路径模板
  template: string;                   // Handlebars 模板文件路径
  condition?: string;                 // 条件表达式（何时生成此文件）
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'array';
  required: boolean;
  default?: unknown;
  description: string;
}
```

### 2.2 Preset — 预设定义

```typescript
interface Preset {
  name: string;                       // 预设名称
  displayName: string;                // 显示名称
  description: string;
  framework: string;                  // 适用框架
  templates: Record<string, string>;  // 模板映射
  rules: string[];                    // 包含的规则集
  conventions: Record<string, unknown>; // 约定配置
  dependencies?: string[];            // 建议安装的依赖
}
```

---

## 3. 上下文模型

### 3.1 ProjectAnalysis — 项目分析结果

```typescript
interface ProjectAnalysis {
  root: string;                       // 项目根目录
  framework: string | null;           // 检测到的框架
  language: string;                   // 检测到的语言
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  structure: DirectoryNode;           // 目录结构树
  modules: ModuleInfo[];              // 模块信息列表
  dependencies: DependencyInfo[];     // 依赖信息
  existingConfig: Partial<GForgeConfig> | null;
}

interface DirectoryNode {
  name: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  metadata?: {
    isComponent?: boolean;
    isModule?: boolean;
    hasTests?: boolean;
    hasCLAUDE?: boolean;
  };
}

interface ModuleInfo {
  name: string;
  path: string;
  type: 'feature' | 'shared' | 'core' | 'api' | 'unknown';
  files: number;
  hasBarrel: boolean;
  hasTests: boolean;
  imports: string[];                  // 导入的其他模块
}
```

### 3.2 ADR — 架构决策记录

```typescript
interface ADR {
  id: string;                         // 如 "ADR-001"
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;                       // ISO 8601 日期
  supersededBy?: string;              // 被哪个 ADR 替代
  context: string;                    // 背景描述
  decision: string;                   // 决策内容
  consequences: string;               // 影响说明
  aiGuidance?: string;               // AI 执行指引
}
```

---

## 4. 持久化方案

### 4.1 本地存储（CLI 模式）

所有数据以文件形式存储在项目目录中：

| 数据 | 格式 | 路径 |
|------|------|------|
| 主配置 | YAML | `.gforge/gforge.config.yaml` |
| 规则定义 | YAML | `.gforge/rules/*.yaml` |
| 模板 | Handlebars + YAML | `.gforge/templates/` |
| 上下文 | Markdown | `**/CLAUDE.md` |
| ADR | Markdown + frontmatter | `docs/decisions/*.md` |
| 术语表 | YAML | `docs/glossary.yaml` |

### 4.2 数据库存储（可选 — 服务端模式）

仅在启用团队协作功能时需要。使用 Drizzle ORM。

```
表结构：
├── projects             # 注册的项目
├── validation_runs      # 校验运行记录
├── violations           # 违规记录
└── presets              # 预设管理
```

---

## 5. 数据流

```
用户输入命令
      │
      ▼
CLI 解析参数
      │
      ▼
加载配置（YAML → GForgeConfig）
      │
      ▼
执行核心逻辑
      │
      ├──▶ 分析项目（→ ProjectAnalysis）
      ├──▶ 校验规则（→ ValidationResult）
      ├──▶ 渲染模板（→ 文件列表）
      └──▶ 生成上下文（→ CLAUDE.md 文件）
      │
      ▼
输出结果 / 写入文件
```

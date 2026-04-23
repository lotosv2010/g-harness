# API 契约定义

> 定义 G-Forge 所有对外接口的契约规格。
> 包括 CLI 命令接口、Node.js API、REST API（可选）。

---

## 1. CLI 命令接口

### 1.1 gforge init

初始化 G-Forge 到项目中。

```bash
gforge init [options]

选项：
  --preset <name>       使用预设模板（react-vite | vue-nuxt | next | base）
  --scan                扫描已有项目结构并生成匹配的配置
  --mode <mode>         初始化模式（full | progressive），默认 full
  --dry-run             仅预览将生成的文件，不实际写入
  --force               覆盖已有配置文件

示例：
  gforge init --preset react-vite
  gforge init --scan --mode progressive
  gforge init --dry-run
```

**行为规格：**

```yaml
输入：
  - 当前工作目录
  - 命令行参数

输出：
  - .claude/settings.json
  - .claude/commands/*.md
  - CLAUDE.md（根级）
  - AGENTS.md（如不存在）
  - docs/ 基础文档结构

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

校验项目是否符合 G-Forge 规则。

```bash
gforge validate [options]

选项：
  --fix                 自动修复可修复的违规
  --rule <id>           仅检查指定规则
  --format <format>     输出格式（text | json | sarif），默认 text
  --severity <level>    最低报告级别（error | warning | info），默认 warning

示例：
  gforge validate
  gforge validate --fix
  gforge validate --format json --severity error
```

### 1.3 gforge context

管理 CLAUDE.md 层级文件。

```bash
gforge context <subcommand>

子命令：
  sync                  分析项目结构，更新所有 CLAUDE.md
  check                 检查 CLAUDE.md 是否与代码结构一致
  generate <path>       为指定目录生成 CLAUDE.md

示例：
  gforge context sync
  gforge context generate src/features/auth
```

### 1.4 gforge scaffold

基于模板生成代码。

```bash
gforge scaffold <type> <name> [options]

类型：
  feature               完整功能模块
  component             UI 组件
  hook                  React/Vue Hook
  api                   API 端点
  store                 状态 Store

选项：
  --path <dir>          生成目标目录（默认自动推断）
  --template <name>     使用指定模板（覆盖预设默认）
  --dry-run             仅预览，不写入

示例：
  gforge scaffold feature user-auth
  gforge scaffold component Button --path src/shared/components
```

### 1.5 gforge migrate

将已有代码迁移至 G-Forge 约定。

```bash
gforge migrate <target> [options]

目标：
  feature <name>        将指定代码迁移为功能模块结构
  naming                按命名约定重命名文件
  imports               重组导入顺序和路径别名

选项：
  --dry-run             仅预览迁移方案
  --interactive         交互式确认每个变更

示例：
  gforge migrate feature user-profile --dry-run
  gforge migrate naming --interactive
```

---

## 2. Node.js API（@gforge/core）

### 2.1 配置加载

```typescript
import { loadConfig } from '@gforge/core';

interface GForgeConfig {
  version: string;
  preset: string;
  project: {
    name: string;
    description: string;
    language: string;
    framework: string;
  };
  context: ContextConfig;
  conventions: ConventionConfig;
  rules: RulesConfig;
  templates: TemplateConfig;
  workflows: WorkflowConfig;
  hooks: HooksConfig;
}

const config: GForgeConfig = await loadConfig(projectRoot);
```

### 2.2 规则校验

```typescript
import { validateProject } from '@gforge/core';

interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

interface Violation {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
}

const result: ValidationResult = await validateProject(projectRoot, {
  rules: ['architecture', 'dependencies'],
  severity: 'warning',
});
```

### 2.3 上下文生成

```typescript
import { generateContext } from '@gforge/core';

interface ContextOptions {
  targetDir: string;
  recursive: boolean;
  overwrite: boolean;
}

const files: string[] = await generateContext(projectRoot, {
  targetDir: 'src/',
  recursive: true,
  overwrite: false,
});
```

### 2.4 模板渲染

```typescript
import { renderTemplate } from '@gforge/core';

interface TemplateData {
  name: string;
  type: 'feature' | 'component' | 'hook' | 'api' | 'store';
  props?: Array<{ name: string; type: string }>;
  [key: string]: unknown;
}

const files: Map<string, string> = await renderTemplate(
  templateName,
  data,
  outputDir,
);
```

---

## 3. REST API（可选 — packages/server）

仅在启用团队协作功能时需要。

### 3.1 基础信息

```
Base URL: /api/v1
认证方式: Bearer Token (JWT)
内容类型: application/json
```

### 3.2 端点一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /projects | 注册项目 |
| GET | /projects/:id | 获取项目信息 |
| GET | /projects/:id/violations | 获取违规列表 |
| POST | /projects/:id/validate | 触发远程校验 |
| GET | /presets | 获取可用预设列表 |
| GET | /presets/:name | 获取预设详情 |

### 3.3 通用响应格式

```typescript
// 成功
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// 失败
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

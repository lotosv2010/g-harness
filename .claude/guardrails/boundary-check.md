# 边界检查守卫（g-forge 项目自身）

> AI 编写 g-forge 代码时的自动边界检查。
> 目标项目的边界检查见 `core/guardrails/boundary-check.md`。

---

## 检查项

### 1. 目录职责边界

| 操作位置 | 允许的内容 | 禁止的内容 |
|----------|-----------|-----------|
| `src/` | TypeScript 代码 | 规范文件（.md） |
| `core/` | 规范文件（.md） | TypeScript 代码 |
| `presets/` | preset.json + 栈特定规范 | 通用规范、代码逻辑 |
| `templates/` | 模板文件（.template.md） | 代码逻辑 |

### 2. core/ 技术栈无关性

在 `core/` 目录的文件中检测以下违规模式：
- 引用特定框架名（React、Vue、Angular、Next.js 等）
- 引用特定构建工具（Vite、Webpack 等）
- 硬编码特定目录路径（应使用 `{{variable}}`）

### 3. 命名合规

- `src/` 中的文件：kebab-case（`file-generator.ts`）
- `core/` 中的文件：kebab-case（`code-quality.md`）
- `presets/` 中的目录：kebab-case（`react-vite/`）
- `templates/` 中的文件：`*.template.md`

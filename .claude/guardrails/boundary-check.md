# 边界检查守卫

> 定义 AI 编写代码时的自动边界检查规则。
> 对应 Claude Code Hooks 的 PostToolUse 事件。

---

## 检查项

### 1. 模块依赖方向

当 AI 修改或创建文件时，检查其导入语句：

| 源文件位置 | 允许导入 | 禁止导入 |
|-----------|----------|----------|
| `packages/shared/` | 仅第三方依赖 | web, server, ai |
| `packages/ai/` | shared, 第三方 | web, server |
| `packages/web/` | shared, ai, 第三方 | server |
| `packages/server/` | shared, ai, 第三方 | web |
| `*/features/A/` | shared, api, core | features/B（其他功能模块） |

### 2. 文件位置合规

- 组件文件（.tsx）必须在 `components/` 目录下
- Hook 文件（use*.ts）必须在 `hooks/` 目录下
- API 调用文件必须在 `api/` 或 `services/` 目录下
- 类型文件（*Types.ts）必须在 `types/` 目录下

### 3. 命名合规

- 组件文件名：PascalCase
- Hook 文件名：camelCase + use 前缀
- 目录名（功能模块）：kebab-case
- 测试文件：`{name}.test.{ext}`

### 4. 禁止模式

在非 API 层文件中检测以下模式：
- `fetch(` — 直接 HTTP 调用
- `axios.` — 直接 axios 调用
- `new XMLHttpRequest` — 直接 XHR

## 实现方式

通过 Claude Code 的 PostToolUse Hook，在 AI 每次写入/编辑文件后自动检查。检查结果反馈给 AI，AI 必须修正违规后才能继续。

# 基础通用规则

> 适用于任意技术栈项目的最小规则集，补充 src/templates/.ai/rules/ 中的通用规则。

---

## BS001：模块边界

- `src/` 下每个顶层目录视为独立模块
- 模块间通过 `index.ts` 暴露公共 API
- 禁止直接导入模块内部文件（如 `import { x } from '../core/internal/helper'`）

## BS002：依赖方向

- `shared/` → 无依赖（纯工具、类型、常量）
- `core/` → 仅依赖 `shared/`
- `features/` → 可依赖 `shared/` + `core/`
- 禁止循环依赖；禁止下层模块反向依赖上层模块

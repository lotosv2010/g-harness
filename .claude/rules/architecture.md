# 架构硬性规则

> 维护系统架构完整性的不可违反规则。

---

## A001：模块边界

```
packages/shared  ← 不依赖任何其他业务包
packages/ai      ← 可依赖 shared
packages/web     ← 可依赖 shared、ai
packages/server  ← 可依赖 shared、ai
```

禁止循环依赖。禁止 shared 依赖 web/server/ai。

## A002：功能模块隔离

Feature 模块之间禁止直接导入：

```
错误：features/auth → features/user（直接导入）
正确：features/auth → shared/（通过共享层）
正确：features/auth → api/（通过 API 层）
```

## A003：API 层集中

所有 HTTP 请求（fetch、axios、HTTP client 调用）必须在 API 层发起：
- 前端：`packages/web/src/api/`
- 服务端：`packages/server/src/routes/` 或 `src/services/`

禁止在组件、Hook、Store 中直接发起 HTTP 请求。

## A004：状态管理边界

- 全局状态：仅用于跨功能模块共享的数据（用户信息、主题等）
- 功能状态：限定在功能模块内部
- 组件状态：仅用于 UI 交互状态

禁止将 UI 交互状态提升到全局。

## A005：公共 API 原则

每个功能模块通过 `index.ts` 暴露公共 API：
- 只导出需要被外部使用的内容
- 内部实现细节不暴露
- 修改内部实现不应破坏外部使用

## A006：配置文件不可随意修改

以下文件修改需要明确的理由和审批：
- `tsconfig.json` / `tsconfig.*.json`
- `.eslintrc.*` / `eslint.config.*`
- `vite.config.*` / `next.config.*`
- `package.json` 的 scripts 和 dependencies
- `.claude/rules/*`

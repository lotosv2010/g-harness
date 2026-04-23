# 架构规则模板

> 维护系统架构完整性的规则。
> 本文件为参数化模板，`{{variable}}` 由目标项目配置填充。

---

## A001：模块边界

定义项目中各模块的依赖方向，禁止循环依赖。

**模板示例（Monorepo）：**
```
{{shared_package}}  ← 不依赖任何其他业务包
{{core_package}}    ← 可依赖 shared
{{app_package}}     ← 可依赖 shared、core
```

**模板示例（单包）：**
```
src/shared/     ← 不依赖功能模块
src/features/*  ← 可依赖 shared
src/pages/*     ← 可依赖 features、shared
```

> 具体边界由项目初始化时根据技术栈预设生成。

## A002：功能模块隔离

Feature 模块之间禁止直接导入：

```
错误：{{feature_dir}}/auth → {{feature_dir}}/user（直接导入）
正确：{{feature_dir}}/auth → {{shared_dir}}/（通过共享层）
正确：{{feature_dir}}/auth → {{api_dir}}/（通过 API 层）
```

## A003：API 层集中

所有外部请求（HTTP、RPC、数据库查询等）必须在专用的 API/Service 层发起：
- 前端：`{{api_dir}}/`
- 服务端：`{{routes_dir}}/` 或 `{{services_dir}}/`

禁止在组件、Hook、Store、Controller 中直接发起外部请求。

## A004：状态管理边界

- 全局状态：仅用于跨功能模块共享的数据（用户信息、主题等）
- 功能状态：限定在功能模块内部
- 组件状态：仅用于 UI 交互状态

禁止将 UI 交互状态提升到全局。

## A005：公共 API 原则

每个功能模块通过入口文件暴露公共 API：
- 只导出需要被外部使用的内容
- 内部实现细节不暴露
- 修改内部实现不应破坏外部使用

## A006：配置文件不可随意修改

以下文件修改需要明确的理由和审批：
- 构建配置（tsconfig、vite.config、webpack.config 等）
- 代码检查配置（eslint、prettier 等）
- 包管理配置（package.json 的 scripts 和 dependencies）
- AI 规则文件

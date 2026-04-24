# Electron 特定规则

> 适用于 Electron 桌面应用项目的额外规则，补充通用规则。

---

## EL001：进程隔离

- 严格区分三层代码：`src/main/`（主进程）、`src/preload/`（预加载）、`src/renderer/`（渲染进程）
- 渲染进程禁止直接使用 Node.js API（`fs`、`path`、`child_process` 等）
- 主进程禁止直接操作 DOM 或引入前端框架
- 共享类型和常量放 `src/shared/`，双端均可引用
- `src/shared/` 中禁止引入任何进程特定的模块

## EL002：IPC 通信

- 所有 IPC channel 名称集中定义在 `src/shared/ipc-channels.ts`，禁止硬编码字符串
- 主进程使用 `ipcMain.handle` 处理异步请求，渲染进程使用 `ipcRenderer.invoke` 调用
- 禁止使用 `ipcRenderer.send` + `ipcMain.on` 的单向模式处理需要返回值的通信
- IPC handler 的入参和返回值必须定义 TypeScript 类型
- 批量数据传输使用结构化克隆（Structured Clone），避免 JSON 序列化大对象

## EL003：Preload 脚本

- preload 脚本通过 `contextBridge.exposeInMainWorld` 暴露 API，禁止直接赋值 `window`
- 暴露的 API 必须最小化，只暴露渲染进程实际需要的功能
- 暴露的每个方法必须有 TypeScript 类型声明（在 `src/shared/` 中定义）
- preload 脚本禁止引入第三方 npm 包，仅使用 Electron 和 Node.js 内置模块

## EL004：安全

- `BrowserWindow` 必须启用 `contextIsolation: true`，禁止关闭
- `BrowserWindow` 必须启用 `sandbox: true`，除非有明确理由并附注释
- 禁止设置 `nodeIntegration: true`
- 外部链接使用 `shell.openExternal`，禁止在应用窗口中直接加载外部 URL
- 禁止使用 `remote` 模块（已废弃且存在安全风险）
- CSP（内容安全策略）必须在 HTML 或 `session.defaultSession.webRequest` 中配置

## EL005：窗口管理

- 窗口创建逻辑封装在 `src/main/windows/` 目录，每种窗口类型一个文件
- 窗口配置（大小、位置、标题）使用常量或配置文件管理，禁止硬编码分散
- 窗口状态（位置、大小）持久化到 `electron-store` 或本地文件
- 多窗口间通信通过主进程中转，禁止渲染进程间直接通信

## EL006：构建与发布

- 构建配置统一在 `electron-builder.yml` 或 `electron-builder` 配置中管理
- 应用签名配置通过环境变量注入，禁止硬编码证书路径
- 自动更新使用 `electron-updater`，更新 URL 通过环境变量配置
- 生产构建必须启用 asar 打包（`asar: true`）

# Tauri 2 特定规则

> 适用于 Tauri 2 桌面应用项目的额外规则，补充通用规则。

---

## TA001：目录隔离

- 前端代码放 `src/`，Rust 后端代码放 `src-tauri/src/`
- 前端禁止直接调用 Node.js API，通过 Tauri API 桥接
- Rust 侧禁止引入前端构建产物或前端类型
- 共享常量（如事件名、命令名）在前端 `src/shared/` 中定义，Rust 侧独立维护对应字符串

## TA002：Command 通信

- Tauri 命令使用 `#[tauri::command]` 宏定义，放 `src-tauri/src/commands/` 目录
- 每个命令文件对应一个业务域（如 `file_commands.rs`、`auth_commands.rs`）
- 命令必须在 `main.rs` 或 `lib.rs` 中通过 `invoke_handler` 注册
- 前端调用使用 `@tauri-apps/api` 的 `invoke` 函数，禁止直接操作底层 IPC
- 命令返回值使用 `Result<T, String>` 或自定义错误类型，前端通过 try/catch 处理

## TA003：Event 系统

- 后端到前端的推送使用 Tauri Event 系统（`app.emit`）
- 事件名称集中定义，前端使用 `listen` / `once` 监听
- 组件卸载时必须 `unlisten` 清理事件监听器
- 禁止用轮询替代事件推送

## TA004：安全

- 权限配置在 `src-tauri/capabilities/` 中声明，遵循最小权限原则
- 禁止开放全部 API 权限（`"permissions": ["core:default"]`），逐项声明需要的能力
- 文件系统访问限制在用户数据目录（`$APPDATA`、`$DOCUMENT` 等安全路径）
- 禁止在 CSP 中使用 `unsafe-inline` 或 `unsafe-eval`
- Rust 侧处理用户输入时必须校验和清理

## TA005：构建与发布

- 构建配置在 `src-tauri/tauri.conf.json` 中管理
- 应用图标放 `src-tauri/icons/`，使用 `tauri icon` 命令生成多尺寸
- 签名配置通过环境变量注入（`TAURI_SIGNING_PRIVATE_KEY`）
- 自动更新使用 Tauri 内置 updater 插件，更新端点通过配置文件指定

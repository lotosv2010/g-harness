# Electron 知识库

## 分层
- `main/` 主进程；`preload/` 能力桥；`renderer/` 前端；`shared/` 同构代码
- IPC 通道名集中定义在 `shared/ipc-channels.ts`

## 关键约束
- 禁止在 renderer 启用 `nodeIntegration`，仅通过 preload 暴露有限 API
- 所有文件系统 / 网络 / 加密操作放主进程
- 大文件与长任务走 `worker_threads`，避免阻塞主进程事件循环

## 常见陷阱
- preload 暴露 API 过于宽泛 → 应只暴露具体能力并做参数校验
- 忘记 contextIsolation = true 引发 XSS → 默认打开
- 打包后路径解析混乱 → 使用 `app.getAppPath()`，避免相对路径

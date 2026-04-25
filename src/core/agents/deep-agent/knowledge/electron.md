# Electron 预设知识库

> 供 Deep Agent 生成规范文件时参考的 Electron 桌面应用知识。
> 版本取向：Electron 28+ / Vite + electron-builder / contextIsolation: true。

## 技术栈定位

Electron 把 Chromium + Node.js 打包成跨平台桌面应用。核心是 **主进程 / 渲染进程 / 预加载脚本** 三层模型，通过 IPC 通信。现代最佳实践：renderer 不开 nodeIntegration，通过 preload 暴露受控 API。

**典型心智模型**：
- 主进程 = Node.js，管窗口/系统交互/后台 IO
- 渲染进程 = 浏览器，跑前端框架（Vue/React/Svelte/...）
- 预加载脚本 = 沙箱桥梁，把"安全受限的 API"注入 `window`
- IPC = `ipcMain` ↔ `ipcRenderer`（经由 preload `contextBridge`）

## 标准分层

```
electron/
├── main/
│   ├── index.ts                # 创建 BrowserWindow，app.whenReady
│   ├── ipc/                    # 主进程 IPC 处理器
│   │   ├── file.handler.ts
│   │   └── system.handler.ts
│   ├── services/               # 主进程业务（文件、DB、网络）
│   ├── window/                 # 多窗口管理
│   ├── tray/                   # 托盘、菜单
│   ├── updater/                # electron-updater
│   └── env.ts                  # 启动配置
├── preload/
│   ├── index.ts                # contextBridge.exposeInMainWorld
│   └── api.ts                  # 暴露的 API type + 实现
└── shared/                     # 主/渲染可共享纯类型（无运行时依赖）
    ├── ipc-channels.ts         # 通道名常量
    └── types.ts

src/                            # 渲染进程（Vite + 任意前端框架）
├── main.ts
├── App.vue / App.tsx
├── api/
│   └── desktop.ts              # 调用 window.electron.xxx 的封装
├── features/
├── components/
└── lib/

resources/                      # 打包资源（icon、installer assets）
build/                          # electron-builder 配置
```

**关键边界**：
- 渲染进程禁用 `nodeIntegration`，通过 preload 暴露的 API 访问 Node 能力
- 主进程不持有 UI 状态；渲染进程不直接 `require('fs')`
- `shared/ipc-channels.ts` 是主/渲染 IPC 通道名的唯一真源（防 typo）

## IPC 设计

- **请求/响应**：`ipcMain.handle(channel, handler)` ↔ `ipcRenderer.invoke(channel, args)`；默认返回 Promise
- **事件推送**：`webContents.send(channel, payload)` ↔ `ipcRenderer.on(channel, handler)`
- **Payload 校验**：用 Zod 在 handler 入口校验；非法输入立即拒绝
- **通道命名**：`<domain>:<action>`，如 `file:read`、`system:toggleDevtools`

## 安全基线

- `contextIsolation: true`（默认）
- `nodeIntegration: false`（默认）
- `sandbox: true` 开启（preload 内不可用 Node 全局，需通过 contextBridge）
- `webSecurity: true`（不关）
- CSP：通过 `session.defaultSession.webRequest.onHeadersReceived` 注入
- 加载远程 URL 严格白名单；`will-navigate` / `will-redirect` 拦截未授权跳转
- `shell.openExternal(url)` 前做协议白名单（只允许 http/https/mailto）

## 常见陷阱

1. **IPC 内存泄漏**：`ipcRenderer.on` 未 cleanup；在 React effect 内必须 `return () => off(...)`
2. **Preload 之外暴露 Node**：一旦 `nodeIntegration: true` 则整条安全链崩
3. **主进程阻塞**：在主进程做 CPU 密集任务会 freeze UI；下沉到 Worker Thread / Utility Process
4. **更新证书**：electron-updater 的代码签名不完整 → 用户静默安装失败
5. **路径差异**：`app.getPath('userData')` 在 dev 和打包后不同；写文件要用 API 而非硬编码
6. **Windows vs macOS**：托盘行为、菜单角色、菜单栏显示差异；需用 `process.platform` 分支
7. **多窗口**：多个 BrowserWindow 共享主进程状态需显式协调，避免竞态

## 推荐 rules

- **R-ELECTRON-01**：`contextIsolation: true` + `nodeIntegration: false` + `sandbox: true`，不可关闭
- **R-ELECTRON-02**：所有 preload 暴露 API 必须有 TypeScript 类型定义（`shared/types.ts` 中）
- **R-ELECTRON-03**：IPC payload 必须 Zod 校验，handler 入口即验证
- **R-ELECTRON-04**：渲染进程禁止直接 `require('electron')` / `require('node:*')`
- **R-ELECTRON-05**：`shell.openExternal` 必须白名单协议；`will-navigate` 必须拦截
- **R-ELECTRON-06**：主进程日志统一 `electron-log`，按 userData 目录落盘 + 滚动
- **R-ELECTRON-07**：自动更新走 `electron-updater`；签名配置在 CI，不入库

## 推荐 protocols

- **新增 IPC**：定义通道名 → 定义入参/出参 Zod schema → 主进程 handler → preload 暴露 → 渲染 api 封装
- **新增窗口**：`WindowManager` 统一创建；禁止在多处 `new BrowserWindow`
- **打包发布**：修改 `electron-builder.yml` → 本地 dry-run → CI 签名 → 灰度发布

## 推荐 ADR 主题

- `打包工具`（electron-builder / electron-forge）
- `自动更新`（electron-updater / 第三方 / 无）
- `前端框架`（Vue / React / Svelte）
- `本地数据`（SQLite / lowdb / 纯 JSON）
- `系统托盘与通知`

## 监控与运维

- 崩溃上报：`crashReporter.start({ submitURL })` + Sentry 桌面端
- 日志：`electron-log` 滚动文件；用户可一键"收集日志"上传
- 性能：`webContents.on('render-process-gone', handler)` 捕获渲染进程崩溃
- 灰度：electron-updater 支持 channel（stable/beta/alpha）

## 测试策略

- 主进程单元：Vitest + 纯函数/service 测试（IPC handler 通过依赖注入解耦）
- 渲染进程：Vitest + RTL/VTU；IPC 用 fake preload
- E2E：Playwright 的 `_electron.launch()` 启动真实进程
- 冒烟：每次打包后在 CI 跑"启动 + 主窗口出现 + 关闭"流程

## 代码骨架示例

### BrowserWindow 创建

```ts
export function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.loadURL(app.isPackaged ? `file://${join(__dirname, '../renderer/index.html')}` : 'http://localhost:5173')
  return win
}
```

### Preload 暴露 API

```ts
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '../shared/types'

const api: DesktopApi = {
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  onUpdateAvailable: (cb) => {
    const listener = (_: unknown, info: UpdateInfo) => cb(info)
    ipcRenderer.on('update:available', listener)
    return () => ipcRenderer.off('update:available', listener)
  },
}

contextBridge.exposeInMainWorld('electron', api)
```

### IPC handler + Zod 校验

```ts
// main/ipc/file.handler.ts
const ReadFileSchema = z.object({ path: z.string().min(1) })

ipcMain.handle('file:read', async (_event, arg) => {
  const { path } = ReadFileSchema.parse(arg)
  if (!path.startsWith(app.getPath('userData'))) {
    throw new Error('路径越界')
  }
  return await readFile(path, 'utf-8')
})
```

### 渲染进程 API 封装

```ts
// src/api/desktop.ts
export async function readUserFile(name: string) {
  const path = `${await window.electron.userDataDir()}/${name}`
  return window.electron.readFile(path)
}
```

## 发布检查清单

- [ ] electron-builder 配置已签名证书（macOS notarize / Windows codesign）
- [ ] `asar` 打包；敏感资源加密或外置
- [ ] 关闭 devtools 在生产（除非显式配置）
- [ ] `app.setAsDefaultProtocolClient` 唯一 scheme
- [ ] 崩溃上报配置生效
- [ ] 自动更新 channel 配置正确
- [ ] Windows / macOS / Linux 三端冒烟通过

## AI 生成规范时的自查清单

生成 Electron 项目规范前，Agent 应确认：

1. 打包工具：`electron-builder` / `electron-forge`？规则配置、CI 步骤都不一样
2. 渲染进程前端：Vue / React / Svelte / 原生？与对应前端预设的规范需合并
3. 是否使用 `electron-vite`？若是，`main/preload/renderer` 三目录结构是官方模板
4. `package.json` 中 `build` / `electron-builder.yml` 是否存在？配置位置决定 CI 脚本
5. 是否使用 `better-sqlite3` / `electron-store` / 纯文件？本地数据规范要对齐
6. 自动更新：`electron-updater` / `autoUpdater` 原生？配置差异大
7. 渲染进程是否 `nodeIntegration: true`（反模式）？若是，第一条 ADR 应是"迁移到 contextBridge"
8. 是否有多窗口 / Tray？影响规则中的"窗口管理"与"生命周期"条目

## 与其他预设的对照要点

- 与 **Vite + React / Vue**：渲染进程本质就是 SPA，前端规则可完全复用，加上 Electron 专属安全条款
- 与 **Tauri**：Tauri 更轻量但前端与后端（Rust）跨语言；Electron 胜在生态 / 团队技能沉淀
- 与 **原生桌面**：Electron 体积大性能差；对性能敏感的工具建议直接原生

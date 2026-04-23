# Claude Code 事件钩子

> 在此目录配置 Claude Code 事件钩子（hooks）。
> 钩子在特定事件触发时自动执行，用于自动化检查和流程控制。

## 可用钩子事件

- `PreToolUse` — 工具调用前
- `PostToolUse` — 工具调用后
- `Notification` — 通知事件
- `Stop` — Claude 停止响应时

## 配置方式

钩子在 `.claude/settings.json` 的 `hooks` 字段中配置。

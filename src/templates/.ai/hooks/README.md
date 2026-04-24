# Claude Code 事件钩子

> 本目录存放 Claude Code Hooks 的实现脚本。
> 钩子在 `.claude/settings.json` 中注册，由 Claude Code 在特定事件时自动调用。

---

## 已实现的钩子

| 文件 | 事件 | 匹配器 | 功能 |
|------|------|--------|------|
| `post-write-boundary-check.mjs` | PostToolUse | Write\|Edit | 校验写入文件的架构边界合规性 |
| `stop-protocol-check.mjs` | Stop | — | 验证协议阶段是否全部完成 |

## 可用事件

| 事件 | 触发时机 | 可否阻断 |
|------|----------|----------|
| `PreToolUse` | 工具调用前 | 是（deny/ask/defer） |
| `PostToolUse` | 工具调用后 | 是（block） |
| `Stop` | Claude 停止响应时 | 是（block） |
| `Notification` | 通知事件 | 否 |
| `SessionStart` | 会话开始 | 否 |

## 钩子协议

- 通过 stdin 接收 JSON 格式的事件数据
- 通过 stdout 返回 JSON 格式的决策结果
- 退出码 0 = 通过，退出码 2 = 阻断
- 执行时间应控制在 10 秒内

## 注册方式

钩子在 `.claude/settings.json` 中配置（由 `gforge init` 自动生成）。

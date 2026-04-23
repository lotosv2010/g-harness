# Claude Code 事件钩子

> 本目录存放 Claude Code Hooks 的实现脚本。
> 钩子在 `.claude/settings.json` 中注册，由 Claude Code 在特定事件时自动调用。

---

## 可用事件

| 事件 | 触发时机 | 用途 |
|------|----------|------|
| `PreToolUse` | 工具调用前 | 拦截危险操作、注入约束 |
| `PostToolUse` | 工具调用后 | 校验文件写入、检查边界 |
| `Notification` | 通知事件 | 状态反馈 |
| `Stop` | Claude 停止响应时 | 自动总结、触发后续流程 |

## 钩子文件命名

```
hooks/
├── post-write-validate.mjs   # PostToolUse(Write|Edit) — 写入校验
└── pre-tool-check.mjs        # PreToolUse — 工具调用前检查
```

## 注册方式

在 `.claude/settings.json` 中配置：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "node .claude/hooks/post-write-validate.mjs",
        "description": "校验写入文件是否符合规则"
      }
    ]
  }
}
```

## 开发注意事项

- 钩子脚本使用 `.mjs` 扩展名（ES Module）
- 通过 stdin 接收 JSON 格式的事件数据
- 通过 stdout 返回 JSON 格式的结果
- 执行时间应控制在 5 秒内
- 失败不应阻塞 AI 工作流（除 PreCommit 外）

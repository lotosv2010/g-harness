# 自动化脚本

> 本目录存放项目自动化脚本。

---

## 脚本列表

| 脚本 | 说明 | 用法 |
|------|------|------|
| `validate-structure.sh` | 校验项目目录结构是否符合规范 | `bash tools/scripts/validate-structure.sh` |
| `sync-claude-md.sh` | 同步更新所有 CLAUDE.md 文件 | `bash tools/scripts/sync-claude-md.sh` |
| `check-boundaries.sh` | 检查模块导入边界 | `bash tools/scripts/check-boundaries.sh` |

## 脚本开发规范

- 使用 Bash 或 Node.js（.mjs）编写
- 脚本开头注明用途和用法
- 支持 `--dry-run` 参数（仅预览不执行）
- 错误信息输出到 stderr
- 成功返回 0，失败返回非 0

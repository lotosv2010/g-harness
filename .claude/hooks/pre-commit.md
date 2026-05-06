# 提交前钩子（g-harness 项目自身）

> 触发时机：执行 git commit 前自动检查。
> 与 `.claude/guardrails/pre-commit.md` 互补：guardrail 定义规则，hook 定义执行时机。

---

## 阻塞检查

1. `pnpm typecheck` — 编译通过
2. `pnpm lint` — 无 error
3. `pnpm test --run` — 测试通过
4. 无硬编码密钥（见 `guardrails/secret-scan.md`）

## 警告检查

5. 无超过 300 行的新文件
6. commit message 符合 Conventional Commits
7. 变更涉及的文档已同步（ARCHITECTURE.md / SDLC-MAP.md）

## 失败处理

- 阻塞项失败：拒绝提交
- 警告项失败：允许提交，输出提醒

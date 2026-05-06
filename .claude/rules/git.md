# Git 硬性规则（g-harness 项目自身）

> 开发 g-harness 时 Git 操作必须遵守的规则。
> 目标项目的 Git 规则见 `src/templates/shared/.ai/rules/git.template.md`。

---

## G001：分支策略

- `main` 为稳定分支，禁止直接推送
- 功能分支：`feat/<描述>`
- 修复分支：`fix/<描述>` 或 `hotfix/<描述>`
- 分支生命周期不超过 5 个工作日

## G002：Commit 规范

- 使用 Conventional Commits：`<type>(<scope>): <description>`
- type：feat / fix / refactor / docs / chore / test / perf / ci
- scope 对应 `src/core/` 下的模块名（commands / scanner / generator / validator / migrator / agents）
- 单次 commit 只做一件事

## G003：合并规则

- PR 合并前必须通过 `pnpm typecheck && pnpm test && pnpm lint`
- 优先 squash merge 保持线性历史
- 禁止 `--force-push` 到 main
- 合并后删除远端功能分支

## G004：敏感内容

- `.gitignore` 已覆盖 `.env*`、`*.key`、`node_modules/`、`dist/`
- 禁止提交含密钥、Token、API Key 的文件

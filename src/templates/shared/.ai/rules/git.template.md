# Git 硬性规则 — {{project_name}}

> 版本控制规范，确保代码历史清晰可追溯。

---

## G001：分支策略

- `main`（或 `master`）为稳定分支，禁止直接推送
- 功能分支命名：`feat/<简要描述>` 或 `feature/<ticket-id>-<描述>`
- 修复分支命名：`fix/<简要描述>` 或 `hotfix/<描述>`
- 分支生命周期不超过 5 个工作日，超期需拆分

## G002：Commit 规范

- 使用 Conventional Commits 格式：`<type>(<scope>): <description>`
- type 允许值：feat / fix / refactor / docs / chore / test / perf / ci
- description 使用祈使语气，首字母小写，不加句号
- 单次 commit 只做一件事，禁止混合功能与重构

## G003：合并规则

- PR/MR 合并前必须通过 CI 检查
- 合并策略：优先 squash merge（保持 main 线性历史）
- 禁止 `--force-push` 到 main 分支
- 合并后删除远端功能分支

## G004：敏感内容

- `.gitignore` 必须包含：`.env*`、`*.key`、`*.pem`、`credentials.*`
- 禁止提交包含密钥、Token、密码的文件
- 发现误提交敏感信息必须立即清除 git 历史

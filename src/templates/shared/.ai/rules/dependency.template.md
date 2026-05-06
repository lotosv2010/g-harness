# 依赖管理硬性规则 — {{project_name}}

> 控制第三方依赖引入、升级和安全性。

---

## D001：引入标准

- 新增依赖前必须说明理由（解决什么问题、为何现有依赖不满足）
- 优先使用已有依赖或语言标准库解决问题
- 禁止引入无维护（>12 月无更新）或星标 <100 的包
- devDependencies 与 dependencies 严格分离

## D002：版本锁定

- 必须提交 lock 文件（`pnpm-lock.yaml` / `package-lock.json` / `yarn.lock`）
- 生产依赖使用精确版本或 `^`（patch 自动升级）
- 禁止使用 `*` 或 `latest` 作为版本号
- 大版本升级需记录 ADR 或在 PR 中说明 breaking changes

## D003：安全审计

- CI 必须集成依赖漏洞扫描（`npm audit` / `pnpm audit`）
- 高危漏洞（CVSS ≥ 7.0）必须在 48 小时内修复或制定缓解方案
- 定期检查废弃依赖（deprecated），及时替换

## D004：License 合规

- 允许的 License 白名单：MIT / Apache-2.0 / BSD-2-Clause / BSD-3-Clause / ISC
- GPL 系列（GPL / LGPL / AGPL）需逐一评审，商业项目默认禁止
- 引入新依赖时必须检查 license 兼容性

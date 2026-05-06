# 依赖管理硬性规则（g-harness 项目自身）

> 开发 g-harness 时依赖管理必须遵守的规则。
> 目标项目的依赖规则见 `src/templates/shared/.ai/rules/dependency.template.md`。

---

## D001：引入标准

- 新增依赖前必须说明理由
- 优先使用已有依赖解决问题
- g-harness CLI 核心功能禁止引入重依赖（LangChain 等为 optional）
- devDependencies 与 dependencies 严格分离

## D002：版本锁定

- 必须提交 `pnpm-lock.yaml`
- 生产依赖使用 `^` 版本（patch 自动升级）
- 禁止使用 `*` 或 `latest`
- 大版本升级需在 PR 中说明 breaking changes

## D003：安全审计

- `pnpm audit` 高危漏洞必须 48 小时内处理
- 定期检查废弃依赖，及时替换

## D004：Optional 依赖管理

- `deepagents` / `@langchain/*` / `zod` 等 AI 相关依赖为 optional
- optional 依赖缺失时必须优雅降级（触发三级降级链）
- `lazy-import.ts` 统一管理动态导入逻辑

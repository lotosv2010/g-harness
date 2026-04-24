# Monorepo 特定规则

> 适用于 Turborepo / Nx + pnpm workspace 项目的额外规则，补充通用规则。

---

## MR001：目录结构

- 应用放 `apps/` 目录，每个应用独立部署
- 共享包放 `packages/` 目录，通过 workspace 协议引用
- 每个包/应用必须有独立的 `package.json` 和 `tsconfig.json`
- 根目录 `package.json` 仅管理工作区配置和根级脚本
- 配置文件（ESLint、Prettier、TypeScript）在根目录定义基础配置，子包 `extends` 继承

## MR002：依赖管理

- 包间引用使用 `workspace:*` 协议，禁止指定具体版本号
- 公共开发依赖提升到根目录（`-w` 安装），减少重复
- 运行时依赖安装到使用它的具体包中，禁止全部提升到根目录
- 禁止循环依赖：包 A 依赖包 B 的同时包 B 不得依赖包 A
- 依赖变更后运行 `pnpm install` 确保 lockfile 同步

## MR003：构建与缓存

- 使用 Turborepo / Nx 的任务编排，声明正确的 `dependsOn` 关系
- 构建产物目录（`dist/`、`.next/`）加入 `outputs` 配置以启用缓存
- CI 环境启用远程缓存（Turborepo Remote Cache / Nx Cloud）
- 每个包的 `build` 脚本必须幂等，支持增量构建
- 禁止在包的构建脚本中引用其他包的源码路径，通过编译后产物引用

## MR004：包边界

- 公共包（`packages/`）不得依赖应用包（`apps/`）
- 公共包通过 `index.ts` 暴露公共 API，禁止导入内部文件
- 应用包可依赖公共包，应用包间禁止直接依赖
- 共享类型放 `packages/types/` 或 `packages/shared/`
- 使用 `@scope/package-name` 命名空间统一包名

## MR005：发布与版本

- 使用 Changesets 管理版本和 Changelog
- 每个 PR 必须包含 changeset 文件（无变更时使用空 changeset）
- 版本号遵循 SemVer，公共包的 breaking change 必须 major bump
- 发布流程：`changeset version` → 审核 → `changeset publish`
- 未发布的包（内部工具、apps）标记 `"private": true`

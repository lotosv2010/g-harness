# 架构硬性规则 — {{project_name}}

> 不可违反。任何修改架构的 PR 必须同步更新本文件。

---

## A001：目录职责分离

```
{{project_structure}}
```

- 代码放 {{shared_dir}} 与业务模块目录
- 文档放 `docs/`
- 构建产物（dist/build/out）不得纳入版本控制

## A002：禁止循环依赖

- 跨模块依赖方向必须单向
- 使用 depcruise / madge 在 CI 中校验（推荐）

## A003：公共契约显式化

- 跨模块通信使用明确导出的类型与函数
- 禁止依赖他模块内部实现细节

## A004：架构升级走 ADR

- 新增跨模块依赖、引入新运行时、替换持久化方案，必须新建 ADR 记录
- ADR 模板见 `docs/decisions/ADR-001-architecture-baseline.md`

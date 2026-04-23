# Prompt：g-forge 功能开发

> 向 Claude Code 下达 g-forge 功能开发指令时使用。

---

## 模板

```
## 任务
[简要描述要实现的功能]

## 背景
[为什么需要这个功能？解决什么问题？]

## 需求详情
- [具体需求点 1]
- [具体需求点 2]

## 技术约束
- 目标模块：src/core/[commands|scanner|generator|validator|migrator]/
- 相关模块：[列出可能涉及的其他模块]
- 参考模式：[参考已有模块的实现方式]

## 验收标准
- [ ] 功能按预期工作
- [ ] 单元测试覆盖核心路径和边界条件
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm lint` 通过
- [ ] 如涉及新模块，更新 `docs/ARCHITECTURE.md`
- [ ] 如涉及新 API，更新 `docs/API.md`

## 非目标
- [明确不需要做的事情]
```

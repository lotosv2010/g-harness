# 测试覆盖率门禁守卫（g-harness 项目自身）

> 确保 g-harness CLI 核心模块有充分测试覆盖。
> 目标项目的覆盖率守卫见 `src/templates/shared/.ai/guardrails/coverage-gate.template.md`。

---

## 阈值

| 维度 | 最低要求 |
|------|----------|
| 增量覆盖率 | ≥80%（新代码） |
| 全局行覆盖率 | ≥70% |

## 关键模块（要求更高覆盖率）

以下模块要求 ≥85% 行覆盖率：
- `src/core/generator/` — 文件生成器（核心输出逻辑）
- `src/core/scanner/` — 项目扫描器
- `src/core/validator/` — 规范校验器

## 豁免

- `src/templates/` — 模板文件无代码逻辑
- `src/presets/` — 配置数据为主
- `src/core/agents/deep-agent/` — optional 依赖，集成测试覆盖

## 检查命令

```bash
pnpm test --coverage
```

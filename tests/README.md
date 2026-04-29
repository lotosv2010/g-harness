# 全局测试

> 本目录存放**所有**测试文件（单元 / 集成 / E2E）。
> 依据 [A005](../.claude/rules/architecture.md#a005测试文件统一放置于根-tests)：禁止在 `src/` 下创建测试文件。

---

## 目录结构

```
tests/
├── <镜像 src/ 的路径>/    # 单元测试，与 src/ 结构 1:1 镜像
│   └── 例：tests/core/validator/rule-validator.test.ts
├── integration/          # 跨模块集成测试
├── e2e/                  # CLI 命令端到端测试
└── helpers/              # 测试辅助工具
```

**示例：**
- `src/core/scanner/project-scanner.ts` → `tests/core/scanner/project-scanner.test.ts`
- `src/core/generator/strategies/deep-agent-strategy.ts` → `tests/core/generator/strategies/deep-agent-strategy.test.ts`

> `src/templates/` 下的 `*.test.template.ts` 是生成到目标项目的**测试模板**，不会被 Vitest 扫描，属 A005 合法例外。

## 测试工具

| 类型 | 工具 |
|------|------|
| 单元测试 | Vitest |
| E2E（CLI） | Vitest + execa |

## 运行方式

```bash
pnpm test             # 运行所有测试
pnpm test:e2e         # 运行 E2E 测试（待实现）
```

## 编写规范

- 单元测试与 `src/` 结构保持镜像
- 每个 E2E 测试使用独立的临时目录
- 测试完成后清理生成的文件
- 测试应独立，无顺序依赖

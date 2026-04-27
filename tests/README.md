# 全局测试

> 本目录存放跨模块的集成测试和端到端测试。
> 单元测试与源文件同级放置（如 `src/core/scanner/project-scanner.test.ts`）。

---

## 目录结构

```
tests/
├── e2e/                  # CLI 命令端到端测试
├── integration/          # 跨模块集成测试
└── helpers/              # 测试辅助工具
```

## 测试工具

| 类型 | 工具 |
|------|------|
| 单元测试 | Vitest |
| E2E（CLI） | Vitest + execa |

## 运行方式

```bash
pnpm test             # 运行所有单元测试
pnpm test:e2e         # 运行 E2E 测试（待实现）
```

## 编写规范

- 每个 E2E 测试使用独立的临时目录
- 测试完成后清理生成的文件
- 测试应独立，无顺序依赖

# 全局测试

> 本目录存放跨包的集成测试和端到端测试。

---

## 目录结构

```
tests/
├── e2e/                  # 端到端测试
│   ├── cli/              # CLI 命令 E2E 测试
│   └── web/              # Web 应用 E2E 测试
├── integration/          # 集成测试
│   └── cross-package/    # 跨包集成测试
├── fixtures/             # 测试用的样本项目
│   ├── react-project/    # React 示例项目
│   └── vue-project/      # Vue 示例项目
└── helpers/              # 测试辅助工具
    └── setup.ts          # 全局测试初始化
```

## 测试工具

| 类型 | 工具 |
|------|------|
| E2E（CLI） | Vitest + execa |
| E2E（Web） | Playwright |
| 集成测试 | Vitest |

## 运行方式

```bash
# 运行所有全局测试
pnpm test:e2e

# 仅 CLI E2E 测试
pnpm test:e2e:cli

# 仅 Web E2E 测试
pnpm test:e2e:web
```

## 编写规范

- 每个 E2E 测试使用独立的临时目录
- 测试完成后清理生成的文件
- 使用 fixtures 目录中的样本项目作为测试输入
- 测试应独立，无顺序依赖

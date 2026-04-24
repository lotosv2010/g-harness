# 边界检查守卫

> 定义 AI 编写代码时的自动边界检查规则。
> 规则配置见 `boundary-rules.json`，由 `post-write-boundary-check.mjs` hook 自动执行。

---

## 规则列表

| ID | 名称 | 检查内容 |
|----|------|----------|
| B001 | 共享模块隔离 | 共享模块（shared/common/lib）不得导入业务模块 |
| B002 | 功能模块隔离 | 功能模块间不得交叉导入（features/A 不导入 features/B） |
| B003 | HTTP 调用限制 | 非 API 层不得直接调用 fetch/axios 等 |

## 配置方式

编辑 `.claude/guardrails/boundary-rules.json` 自定义规则参数：

```json
{
  "rules": [
    {
      "id": "B001",
      "sharedDirs": ["src/shared/", "src/lib/"],
      "forbiddenImports": ["features", "pages"]
    }
  ]
}
```

## 执行方式

- **自动**：PostToolUse(Write|Edit) hook 在每次文件写入后触发
- **手动**：`gforge validate` 全量扫描，`gforge check` 增量扫描

## 自定义规则

如需添加新的边界规则：
1. 在 `boundary-rules.json` 中新增规则条目
2. 在 `post-write-boundary-check.mjs` 中实现对应检查函数

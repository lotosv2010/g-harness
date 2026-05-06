---
name: scaffold
description: 按照项目约定快速生成代码模块脚手架（组件、模块、页面、API 端点）。
triggers:
  - 创建组件
  - 新增模块
  - 生成页面
  - 添加 API
  - 脚手架
invocable: true
arguments:
  - name: type
    hint: "<component|module|page|api>"
    required: true
  - name: name
    hint: "<名称>"
    required: true
capabilities:
  - read
  - write
  - search
---

# 脚手架生成（scaffold）

按项目约定快速生成模块骨架代码。

## 用法

```
/scaffold module user-service
/scaffold component LoginForm
/scaffold page settings
/scaffold api /users
```

## 执行步骤

1. 读取项目结构和命名约定
2. 确定生成位置（基于 type 和项目目录结构）
3. 生成文件：源码 + 类型 + 测试 + 索引导出
4. 输出生成结果

## 生成内容

| 类型 | 产出文件 |
|------|----------|
| module | `index.ts` + `types.ts` + `*.test.ts` |
| component | 组件文件 + 样式 + 测试 |
| page | 页面组件 + 路由注册提示 |
| api | handler + types + 测试 |

## 约束

- 遵循项目现有命名和目录约定
- 生成的代码符合 rules 中的代码质量规则
- 使用命名导出
- 测试文件同步生成

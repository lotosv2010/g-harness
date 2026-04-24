---
name: scaffold
description: 按照项目约定快速生成代码模块脚手架。当用户请求"创建组件"、"新增模块"时使用。
triggers:
  - 创建组件
  - 新增模块
  - 生成 Hook
  - 添加 API
  - 新增功能模块
  - 脚手架
invocable: true
arguments:
  - name: type
    hint: "module | component | hook | api | page"
    required: true
  - name: name
    hint: "<name>"
    required: true
capabilities:
  - read
  - write
  - search
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep"
---

# 脚手架生成

按照项目约定生成符合规范的代码模块。

## 用法

```
/scaffold module <name>           # 新增功能模块
/scaffold component <name>        # 新增组件
/scaffold hook <name>             # 新增 Hook
/scaffold api <name>              # 新增 API 端点/服务
/scaffold page <name>             # 新增页面
```

## 支持的模块类型

### module（功能模块）

```
<name>/
├── index.ts               # 公共 API（命名导出）
├── <name>.ts              # 核心实现
├── <name>.test.ts         # 单元测试
└── types.ts               # 模块内部类型（可选）
```

### component（UI 组件）

```
<name>/
├── index.ts               # 导出
├── <Name>.tsx             # 组件实现
├── <Name>.test.tsx        # 组件测试
└── <Name>.css             # 样式（可选）
```

### hook（自定义 Hook）

```
hooks/
├── use<Name>.ts           # Hook 实现
└── use<Name>.test.ts      # Hook 测试
```

### api（API 端点/服务）

```
api/
├── <name>.ts              # API 服务封装
└── <name>.test.ts         # API 测试
```

### page（页面）

```
pages/
├── <name>/
│   ├── index.tsx          # 页面组件
│   └── <name>.test.tsx    # 页面测试
```

## 执行步骤

1. 解析参数 `$type` 和 `$name`
2. 按命名约定转换名称（文件 kebab-case，组件 PascalCase，Hook camelCase）
3. 读取项目现有结构，确认生成路径
4. 确认生成路径和文件列表，等待用户确认
5. 生成所有文件（包含基础骨架，不留空文件）
6. 更新相关的入口文件（index.ts）
7. 报告生成结果

## 约束

- 遵循 `AGENTS.md` 命名约定
- 遵循 `.claude/rules/` 所有硬性规则
- 使用命名导出，禁止 `export default`（除非框架要求）
- 禁止 `export *`
- 每个生成的文件都必须有实际内容（不留空骨架）
- 生成的测试文件需包含至少一个基础测试用例

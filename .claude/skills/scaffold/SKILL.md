---
name: scaffold
description: 按照项目约定快速生成代码模块脚手架。当用户请求"创建组件"、"新增模块"、"生成 Hook"、"添加 API 端点"时使用。
when_to_use: 创建组件, 新增模块, 生成 Hook, 添加 API, 新增功能模块, 脚手架
user-invocable: true
allowed-tools: Read Write Edit Glob Grep
argument-hint: "[type] [name]"
arguments:
  - type
  - name
---

# 脚手架生成

按照项目约定生成符合规范的代码模块。

## 用法

```
/scaffold feature user-auth
/scaffold component Button
/scaffold hook useAuth
/scaffold api users
/scaffold store auth
```

## 支持的模块类型

### feature（功能模块）

生成路径：`packages/web/src/features/$name/`

```
$name/
├── components/
│   └── .gitkeep
├── hooks/
│   └── .gitkeep
├── services/
│   └── .gitkeep
├── stores/
│   └── .gitkeep
├── types/
│   └── index.ts
├── utils/
│   └── .gitkeep
├── __tests__/
│   └── .gitkeep
└── index.ts
```

### component（UI 组件）

生成路径：由上下文推断，默认 `packages/web/src/shared/components/$Name/`

```
$Name/
├── $Name.tsx
├── $Name.test.tsx
└── index.ts
```

### hook

生成路径：由上下文推断

```
use$Name.ts
use$Name.test.ts
```

### api（API 端点）

生成路径：`packages/web/src/api/endpoints/`

```
$name.ts
$name.test.ts
```

### store（状态 Store）

生成路径：由上下文推断

```
$nameStore.ts
$nameStore.test.ts
```

## 执行步骤

1. 解析参数 `$type` 和 `$name`
2. 按 `AGENTS.md` 命名约定转换名称（PascalCase / camelCase / kebab-case）
3. 确认生成路径和文件列表
4. 生成所有文件（包含基础骨架代码，不留空文件）
5. 更新最近的桶文件（index.ts）
6. 测试文件至少包含一个基础测试用例
7. 报告生成结果

## 约束

- 遵循 `AGENTS.md` 命名约定
- 遵循 `.claude/rules/` 所有硬性规则
- 组件使用函数式声明 + 命名导出
- 禁止 `export default`
- 禁止 `export *`

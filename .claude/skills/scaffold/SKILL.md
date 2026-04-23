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
/scaffold cli <command-name>      # 新增 CLI 命令
/scaffold module <name>           # 新增 src/core/ 模块
/scaffold preset <name>           # 新增技术栈预设
/scaffold rule <id>               # 新增 core/ 规则文件
/scaffold protocol <name>         # 新增 core/ 协议文件
```

## 支持的模块类型

### cli（CLI 命令）

生成路径：`src/cli/`

```
commands/
└── $name.ts                # 命令实现
```

### module（核心模块）

生成路径：`src/core/$name/`

```
$name/
├── index.ts               # 公共 API（命名导出）
├── $name.ts               # 实现
└── $name.test.ts          # 测试
```

### preset（技术栈预设）

生成路径：`presets/$name/`

```
$name/
├── preset.json            # 预设元数据
└── rules/                 # 栈特定规则（可选）
```

### rule（规则文件）

生成路径：`core/rules/`

```
$name.md                   # 规则定义（参数化模板）
```

### protocol（协议文件）

生成路径：`core/protocols/`

```
$name.md                   # 协议定义
```

## 执行步骤

1. 解析参数 `$type` 和 `$name`
2. 按命名约定转换名称（kebab-case）
3. 确认生成路径和文件列表
4. 生成所有文件（包含基础骨架，不留空文件）
5. 更新相关的入口文件（index.ts）
6. 报告生成结果

## 约束

- 遵循 `AGENTS.md` 命名约定
- 遵循 `.claude/rules/` 所有硬性规则
- 使用命名导出，禁止 `export default`
- 禁止 `export *`
- `core/` 中的规则和协议必须技术栈无关

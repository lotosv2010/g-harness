# GitHub Copilot Instructions — {{project_name}}

## 项目定位

{{project_description}}

## 技术栈

{{tech_stack}}

## 架构速览

{{architecture_overview}}

## 代码规范

{{code_standards}}

## 常用命令

{{commands}}

## 安全约束

- 禁止读取或泄漏 `.env*` 内容
- 禁止硬编码密钥、Token
- 破坏性操作（删除、reset、发布）需先确认
- 未经用户明确要求不自行 `git commit` / `git push`

参考：`AGENTS.md`、`docs/SPEC.md`、`docs/ARCHITECTURE.md`。

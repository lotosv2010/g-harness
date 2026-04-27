# AGENTS.md — {{project_name}}

> 面向所有 AI 编程助手的通用规范入口。
> 由 G-Harness 生成，遵循 Harness Engineering 范式。

---

## 项目一句话

{{project_description}}

## 技术栈

{{tech_stack}}

## 架构速览

{{architecture_overview}}

## 模块划分

{{module_breakdown}}

## 目录结构

```
{{project_structure}}
```

## 工作规则

每次执行任务前，按顺序读取：

1. 本文件（`AGENTS.md`）
2. 对应 AI 助手入口（如 `CLAUDE.md` / `.cursorrules`）
3. 对应规则目录（如 `.claude/rules/*.md`）
4. `docs/SPEC.md`、`docs/ARCHITECTURE.md`
5. `docs/tasks/CURRENT.md`（如存在）

## 核心规则

{{code_standards}}

## 常用命令

{{commands}}

## 安全约束

- 禁止读取、输出、复制任何 `.env*` 文件内容
- 禁止在代码中硬编码密钥、Token、私钥
- 破坏性操作（删除文件、git reset、发布）必须先确认
- 未经用户明确要求，禁止自行执行 `git commit` / `git push`

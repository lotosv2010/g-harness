# 架构硬性规则（g-forge 项目自身）

> 维护 g-forge 框架项目自身架构完整性的规则。
> 目标项目的架构规则见 `src/templates/.claude/rules/architecture.md`。

---

## A001：目录职责分离

```
src/              ← 全部业务代码
src/core          ← CLI 引擎（命令、扫描、生成、校验、迁移）
src/presets       ← 技术栈预设，不含通用规范
src/templates     ← 可分发内容，1:1 镜像目标项目，不含代码逻辑
.claude/          ← 开发 g-forge 自身的 Claude Code 配置
docs/             ← 约束与规格文档
tools/            ← Prompt 模板与自动化脚本
```

禁止混放：代码逻辑不进 templates/，规范内容不进 core/。

## A002：src/templates/ 技术栈无关

`src/templates/` 目录中的规范文件必须技术栈无关：
- 不引用特定框架（React、Vue、Angular 等）
- 不引用特定构建工具（Vite、Webpack 等）
- 使用 `{{variable}}` 占位符替代具体路径
- 技术栈特定内容放 `src/presets/` 中

## A003：src/presets/ 自包含

每个预设目录必须自包含：
- 包含 `preset.json` 描述元数据
- 可包含栈特定的规则和技能
- 不依赖其他预设

## A004：配置文件不可随意修改

以下文件修改需要明确的理由：
- `tsconfig.json`
- `eslint.config.*`
- `package.json` 的 scripts 和 dependencies
- `.claude/rules/*`
- `src/templates/.claude/rules/*`

# 架构硬性规则（g-forge 项目自身）

> 维护 g-forge 框架项目自身架构完整性的规则。
> 目标项目的架构规则见 `core/rules/architecture.md`。

---

## A001：目录职责分离

```
src/          ← CLI 工具源码，不含规范内容
core/         ← 通用规范文件，不含代码逻辑
presets/      ← 技术栈预设，不含通用规范
templates/    ← 文件模板，不含代码逻辑
.claude/      ← 开发 g-forge 自身的 Claude Code 配置
```

禁止混放：代码逻辑不进 core/，规范内容不进 src/。

## A002：core/ 技术栈无关

`core/` 目录中的规范文件必须技术栈无关：
- 不引用特定框架（React、Vue、Angular 等）
- 不引用特定构建工具（Vite、Webpack 等）
- 使用 `{{variable}}` 占位符替代具体路径
- 技术栈特定内容放 `presets/` 中

## A003：presets/ 自包含

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
- `core/rules/*`

# 架构硬性规则（g-harness 项目自身）

> 维护 g-harness 框架项目自身架构完整性的规则。
> 目标项目的架构规则见 `src/templates/.ai/rules/architecture.md`。

---

## A001：目录职责分离

```
src/              ← 全部业务代码
src/core          ← CLI 引擎（命令、扫描、生成、校验、迁移）
src/presets       ← 技术栈预设，不含通用规范
src/templates     ← 可分发内容，1:1 镜像目标项目，不含代码逻辑
.claude/          ← 开发 g-harness 自身的 Claude Code 配置
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
- `src/templates/.ai/rules/*`

## A005：测试文件统一放置于根 `tests/`

所有 `*.test.ts` / `*.test.tsx` 测试文件必须放在项目根 `tests/` 目录下，**禁止**在 `src/` 或其他业务目录下创建测试文件。

理由：
- 保持业务代码目录（`src/`）整洁，不混杂测试产物
- 测试集中管理，便于 CI 配置、覆盖率统计与发布时排除
- 避免 `src/templates/` 模板内容被测试文件污染

要求：
- 新增测试一律写入 `tests/<模块路径>/<name>.test.ts`
- 被测模块路径与 `src/` 结构保持镜像，例如 `src/core/validator/foo.ts` → `tests/core/validator/foo.test.ts`
- `src/templates/` 中可存在 `*.test.template.ts` 作为生成到目标项目的测试模板（不会被 Vitest 扫描）

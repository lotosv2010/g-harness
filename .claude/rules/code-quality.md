# 代码质量硬性规则（g-forge 项目自身）

> 开发 g-forge CLI 和框架代码时必须遵守的规则。
> 目标项目的代码质量规则见 `core/rules/code-quality.md`。

---

## R001：严格类型

- TypeScript 必须启用 `strict: true`
- 禁止使用 `any` 类型，使用 `unknown` + 类型守卫替代
- 禁止使用 `@ts-ignore`，使用 `@ts-expect-error` 并附带原因注释

## R002：命名导出优先

- 所有模块使用命名导出（`export function`）
- 禁止默认导出（`export default`）
- 桶文件（index.ts）使用显式命名重导出，禁止 `export *`

## R003：错误处理

- 禁止空 catch 块
- 错误必须被处理或显式向上传播
- CLI 命令使用统一的错误处理和退出码

## R004：文件长度

- 单个文件不超过 300 行
- 超过 200 行时应考虑拆分
- 测试文件不受此限制

## R005：函数复杂度

- 单个函数不超过 40 行
- 参数不超过 4 个，超过时使用 options 对象

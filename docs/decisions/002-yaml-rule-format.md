---
id: ADR-002
status: accepted
date: 2026-04-23
superseded_by: null
---

# YAML 作为规则定义格式

## 背景

规则引擎需要一种定义格式，让开发者和 AI 都能方便地读写架构约束规则。

## 决策

使用 YAML 作为规则定义格式，JSON Schema 用于校验 YAML 结构。

## 备选方案

### 方案 A：YAML（选定）
- 优点：可读性好、支持注释、AI 易生成、与 GitHub Actions 等生态一致
- 缺点：缩进敏感、解析比 JSON 慢

### 方案 B：JSON
- 优点：解析快、原生支持
- 缺点：不支持注释、可读性差、冗余字符多

### 方案 C：TypeScript DSL
- 优点：类型安全、IDE 补全
- 缺点：需要编译步骤、非开发者不易编辑

## 影响

### 正面影响
- 非开发者（如项目经理）也能理解和编辑规则
- AI 生成规则时无需考虑类型系统
- 与 CI/CD 配置风格一致

### 负面影响 / 权衡
- 需要运行时 YAML 解析（使用 `yaml` npm 包）
- 格式错误排查比 TypeScript 略难

## AI 指引

- 规则文件放在 `.gforge/rules/` 目录
- 文件扩展名统一使用 `.yaml`（非 `.yml`）
- 每个规则集一个文件（如 `architecture.yaml`、`dependencies.yaml`）
- 规则 ID 使用 kebab-case（如 `no-cross-feature-import`）

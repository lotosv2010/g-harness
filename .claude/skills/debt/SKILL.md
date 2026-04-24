---
name: debt
description: 技术债扫描 — 识别 TODO/FIXME/HACK、过期依赖、复杂度超标、测试缺口，输出分级清单并写入债务登记簿。
triggers:
  - 技术债
  - 债务扫描
  - TODO 清理
  - 代码体检
invocable: true
arguments:
  - name: scope
    hint: "[scope]"
    required: false
capabilities:
  - read
  - write
  - search
  - execute
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep Bash(wc *) Bash(find *) Bash(git log *)"
    context: fork
---

# 技术债扫描（debt）

系统性识别和登记技术债务，避免隐性债务积累。

## 用法

```
/debt                  # 全项目扫描
/debt src/core         # 扫描指定模块
```

## 扫描维度

### 1. 显性标记（权重 30%）

扫描代码中的显性债务标记：

| 标记 | 严重度 | 含义 |
|------|--------|------|
| `TODO` | info | 待完成功能 |
| `FIXME` | warning | 已知缺陷未修复 |
| `HACK` / `WORKAROUND` | warning | 临时方案 |
| `@ts-expect-error` | warning | 类型系统绕过 |
| `eslint-disable` | info | 规则豁免 |
| `any` 类型 | warning | 类型安全缺口 |

每条标记提取：文件路径、行号、上下文、存在时长（git blame）。

### 2. 结构性债务（权重 30%）

- 文件行数超标（> 300 行）
- 函数体超标（> 40 行）
- 循环复杂度过高（嵌套 > 3 层）
- 参数过多（> 4 个）
- 重复代码块（相似度 > 80%）
- 循环依赖

### 3. 测试债务（权重 20%）

- 无测试覆盖的业务逻辑文件
- 测试文件存在但为空或仅有骨架
- 测试中的 `skip` / `todo` 标记

### 4. 依赖债务（权重 20%）

- 过时的依赖（major 版本落后 ≥ 2）
- 已废弃的依赖（npm deprecated）
- 未使用的依赖（声明但未 import）
- 功能重叠的依赖

## 输出格式

```markdown
## 技术债报告

**扫描范围**：[路径]
**扫描时间**：YYYY-MM-DD
**债务评分**：X / 100（越高越健康）

### 债务摘要

| 维度 | 问题数 | 严重度分布 |
|------|--------|-----------|
| 显性标记 | N | 🔴 N / 🟡 N / 🔵 N |
| 结构性 | N | ... |
| 测试缺口 | N | ... |
| 依赖 | N | ... |

### 详细清单（按优先级排序）

#### 🔴 高优先级
- [file:line] 问题描述 — 存在 N 天，修复成本 S/M/L

#### 🟡 中优先级
- ...

#### 🔵 低优先级
- ...

### 清偿建议
1. [建议 1] — 预计投入 X 小时
2. [建议 2] — 预计投入 X 小时
```

## 债务登记簿

扫描结果同时追加写入 `docs/TECH_DEBT.md`（如不存在则创建），格式：

```markdown
# 技术债登记簿

> 由 /debt 自动维护。手动添加请遵循格式。

| ID | 位置 | 描述 | 严重度 | 发现日期 | 状态 |
|----|------|------|--------|----------|------|
| TD-001 | src/foo.ts:42 | TODO 未实现 | warning | 2026-04-24 | open |
```

## 约束

- 不自动修复任何债务，仅识别和登记
- 测试文件（`.test.`）和 fixtures 不参与结构性检查
- `node_modules`、`dist` 等目录跳过

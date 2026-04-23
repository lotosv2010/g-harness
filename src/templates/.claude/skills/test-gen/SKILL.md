---
name: test-gen
description: 为指定文件或模块自动生成测试用例。分析源码导出项，生成覆盖正常路径、边界条件和异常处理的测试。
when_to_use: 写测试, 生成测试, 补充测试, 测试覆盖, 增加测试
user-invocable: true
allowed-tools: Read Write Edit Glob Grep
argument-hint: "[filepath]"
arguments:
  - filepath
---

# 测试生成

为指定文件自动生成完整的测试用例。

## 执行步骤

1. 读取 `$filepath` 源文件
2. 分析所有导出项（函数、类、接口）
3. 对每个导出项分析：
   - 输入参数和类型
   - 返回值和类型
   - 副作用（文件操作、异步调用）
   - 边界条件（空值、极值、类型边界）
4. 生成测试文件到对应位置
5. 确保测试可独立运行

## 测试文件位置

- 源文件 `foo.ts` → 测试文件 `foo.test.ts`（同目录）
- 如果模块有 `__tests__/` 目录，优先放入其中

## 约束

- 测试验证行为，不验证实现细节
- 每个测试用例独立，无顺序依赖
- 使用命名导入，与源码导出风格一致

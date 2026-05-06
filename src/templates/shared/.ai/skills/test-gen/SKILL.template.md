---
name: test-gen
description: 为指定文件或模块自动生成测试用例。分析源码导出项，覆盖正常路径、边界条件和异常处理。
triggers:
  - 写测试
  - 生成测试
  - 补充测试
  - 测试覆盖
invocable: true
arguments:
  - name: filepath
    hint: "<filepath>"
    required: true
capabilities:
  - read
  - write
  - search
---

# 测试生成（test-gen）

为指定文件自动生成完整的测试用例。

## 用法

```
/test-gen src/services/user-service.ts
/test-gen src/utils/validator.ts
```

## 执行步骤

1. 读取目标源文件
2. 分析所有导出项（函数、类、接口）
3. 对每个导出项识别：输入参数、返回值、副作用、边界条件
4. 生成测试文件
5. 确保测试可独立运行

## 测试覆盖维度

- **正向路径**：正常输入返回正确结果
- **边界条件**：空值、极值、类型边界
- **异常处理**：非法输入、错误传播

## 约束

- 测试验证行为，不验证实现细节
- 每个测试用例独立，无顺序依赖
- 使用命名导入，与源码导出风格一致
- 文件操作测试使用临时目录或 mock

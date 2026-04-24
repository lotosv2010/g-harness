---
name: test-gen
description: 为指定文件或模块自动生成测试用例。分析源码导出项，生成覆盖正常路径、边界条件和异常处理的测试。
triggers:
  - 写测试
  - 生成测试
  - 补充测试
  - 测试覆盖
  - 增加测试
invocable: true
arguments:
  - name: filepath
    hint: "<filepath>"
    required: true
capabilities:
  - read
  - write
  - search
extensions:
  claude:
    allowed-tools: "Read Write Edit Glob Grep"
---

# 测试生成

为指定文件自动生成完整的测试用例。

## 用法

```
/test-gen src/core/scanner/project-scanner.ts
/test-gen src/core/generator/file-generator.ts
/test-gen src/core/variables.ts
```

## 执行步骤

1. **优先读取索引**（`docs/PROJECT_MAP.md` / `docs/FEATURES.md`）
   - 通过 `$filepath` 反查所属模块及其 exports
   - 若索引不存在或未收录该文件，先建议运行 `gforge index`
2. 读取 `$filepath` 源文件
3. 分析所有导出项（函数、类、接口）
4. 对每个导出项分析：
   - 输入参数和类型
   - 返回值和类型
   - 副作用（文件操作、异步调用）
   - 边界条件（空值、极值、类型边界）
5. 生成测试文件到对应位置
6. 确保测试可独立运行
7. 生成后提示运行 `gforge index` 刷新索引

## 测试文件位置

- 源文件 `foo.ts` → 测试文件 `foo.test.ts`（同目录）
- 如果模块有 `__tests__/` 目录，优先放入其中

## 测试模板

### 工具函数

```typescript
import { describe, it, expect } from 'vitest'
import { functionName } from './source'

describe('functionName', () => {
  it('正常输入返回正确结果', () => {
    // arrange → act → assert
  })

  it('边界条件：空输入', () => {})
  it('边界条件：极值', () => {})
  it('异常输入抛出错误', () => {})
})
```

### 类（Scanner / Generator / Validator 等）

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ClassName } from './source'

describe('ClassName', () => {
  let instance: ClassName

  beforeEach(() => {
    instance = new ClassName()
  })

  it('正常情况返回预期结果', async () => {})
  it('边界条件处理正确', async () => {})
  it('错误情况抛出合适的异常', async () => {})
})
```

### CLI 命令

```typescript
import { describe, it, expect } from 'vitest'

describe('gforge <command>', () => {
  it('正常参数执行成功', async () => {})
  it('缺少必要参数报错', async () => {})
  it('--dry-run 不写入文件', async () => {})
})
```

## 约束

- 测试框架：Vitest
- 文件操作测试：使用临时目录或 mock
- 测试验证行为，不验证实现细节
- 每个测试用例独立，无顺序依赖
- 使用命名导入，与源码导出风格一致

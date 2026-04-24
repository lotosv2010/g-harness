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
/test-gen src/services/user-service.ts
/test-gen src/components/UserCard.tsx
/test-gen src/utils/format.ts
```

## 执行步骤

1. **优先读取索引**（`docs/PROJECT_MAP.md` / `docs/FEATURES.md`）
   - 通过 `$filepath` 反查所属模块及其公共 API，避免广度扫描
   - 若文件属于某模块的 `entry`，测试应覆盖其 exports 清单中的所有符号
   - 若索引不存在或已过期（文件未收录），先提示用户运行 `gforge index`
2. 读取 `$filepath` 源文件
3. 分析所有导出项（函数、类、接口）
4. 对每个导出项分析：
   - 输入参数和类型
   - 返回值和类型
   - 副作用（文件操作、异步调用、状态变更）
   - 边界条件（空值、极值、类型边界、空数组）
5. 检查项目使用的测试框架（读取 package.json）
6. 生成测试文件到对应位置
7. 确保测试可独立运行
8. **索引刷新提示**：若生成了新测试文件，提醒用户运行 `gforge index` 更新 PROJECT_MAP 的文件数

## 测试文件位置

- 源文件 `foo.ts` → 测试文件 `foo.test.ts`（同目录）
- 如果模块有 `__tests__/` 目录，优先放入其中
- 优先参考 PROJECT_MAP 中该模块现有测试文件的位置约定

## 测试模式参考

### 纯函数

```typescript
describe('functionName', () => {
  it('正常输入返回正确结果', () => {
    expect(functionName(validInput)).toEqual(expectedOutput)
  })

  it('边界条件：空输入', () => {
    expect(functionName('')).toEqual(defaultResult)
  })

  it('边界条件：极值', () => {
    expect(functionName(Number.MAX_SAFE_INTEGER)).not.toThrow()
  })

  it('无效输入抛出错误', () => {
    expect(() => functionName(null)).toThrow()
  })
})
```

### 异步函数

```typescript
describe('asyncFunction', () => {
  it('成功路径返回预期数据', async () => {
    const result = await asyncFunction(validInput)
    expect(result).toMatchObject(expected)
  })

  it('失败时抛出有意义的错误', async () => {
    await expect(asyncFunction(badInput)).rejects.toThrow(/descriptive message/)
  })

  it('超时或网络错误的处理', async () => {
    // mock 外部依赖，模拟失败场景
  })
})
```

### 类实例

```typescript
describe('ClassName', () => {
  let instance: ClassName

  beforeEach(() => {
    instance = new ClassName()
  })

  it('初始状态正确', () => {
    expect(instance.state).toBe(expectedInitial)
  })

  it('核心方法返回预期结果', async () => {
    const result = await instance.method(input)
    expect(result).toEqual(expected)
  })

  it('错误情况抛出合适的异常', async () => {
    await expect(instance.method(badInput)).rejects.toThrow()
  })
})
```

### 有副作用的函数（文件 I/O、HTTP 等）

```typescript
import { vi } from 'vitest'

describe('functionWithSideEffects', () => {
  it('正常场景调用正确的依赖', async () => {
    const mockDep = vi.fn().mockResolvedValue(mockData)
    const result = await functionWithSideEffects(input, { dep: mockDep })
    expect(mockDep).toHaveBeenCalledWith(expectedArgs)
    expect(result).toEqual(expected)
  })

  it('依赖失败时优雅处理', async () => {
    const mockDep = vi.fn().mockRejectedValue(new Error('fail'))
    // 验证错误被正确传播或处理
  })
})
```

## 覆盖原则

每个导出项至少覆盖：
1. **正常路径** — 典型输入的预期输出
2. **空值/默认值** — 空字符串、空数组、null、undefined
3. **边界条件** — 极值、类型边界、临界长度
4. **错误路径** — 无效输入、依赖失败

## 约束

- **索引优先**：必须先读索引定位模块范围，禁止直接整库搜索
- 自动检测项目测试框架（Vitest / Jest / Mocha）
- 文件操作测试：使用临时目录或 mock
- 测试验证行为，不验证实现细节
- 每个测试用例独立，无顺序依赖
- 使用命名导入，与源码导出风格一致
- 测试描述使用中文或英文，与项目现有测试保持一致
- 生成完成后如新增了模块/文件，提示用户运行 `gforge index` 刷新索引

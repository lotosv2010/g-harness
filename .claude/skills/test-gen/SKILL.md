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

## 用法

```
/test-gen packages/web/src/shared/utils/formatDate.ts
/test-gen packages/web/src/features/auth/hooks/useAuth.ts
/test-gen packages/web/src/shared/components/Button/Button.tsx
```

## 执行步骤

1. 读取 `$filepath` 源文件
2. 分析所有导出项（函数、组件、Hook、类型）
3. 对每个导出项分析：
   - 输入参数和类型
   - 返回值和类型
   - 副作用（API 调用、状态变更、DOM 操作）
   - 边界条件（空值、极值、类型边界）
4. 生成测试文件到对应位置
5. 确保测试可独立运行

## 测试文件位置

- 源文件 `foo.ts` → 测试文件 `foo.test.ts`（同目录）
- 源文件 `Foo.tsx` → 测试文件 `Foo.test.tsx`（同目录）
- 如果模块有 `__tests__/` 目录，优先放入其中

## 按类型生成模板

### 工具函数

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from './source';

describe('functionName', () => {
  it('正常输入返回正确结果', () => {
    // arrange → act → assert
  });

  it('边界条件：空输入', () => {});
  it('边界条件：极值', () => {});
  it('异常输入抛出错误', () => {});
});
```

### React 组件

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('正常渲染无崩溃', () => {
    render(<ComponentName />);
  });

  it('正确展示传入的 Props', () => {});
  it('用户交互触发正确行为', () => {});
  it('加载/错误/空状态正确展示', () => {});
});
```

### Hook

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHookName } from './useHookName';

describe('useHookName', () => {
  it('返回正确的初始状态', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current).toBeDefined();
  });

  it('状态变更行为正确', () => {});
  it('清理副作用', () => {});
});
```

### API 函数

```typescript
import { describe, it, expect, vi } from 'vitest';
import { apiFunction } from './apiFunction';

describe('apiFunction', () => {
  it('成功响应正确解析', () => {});
  it('错误响应正确处理', () => {});
  it('网络错误正确处理', () => {});
  it('请求参数正确传递', () => {});
});
```

## 约束

- 测试框架：Vitest
- 组件测试：@testing-library/react + userEvent
- HTTP Mock：MSW 或 vi.mock
- 测试验证行为，不验证实现细节
- 每个测试用例独立，无顺序依赖
- 使用命名导入，与源码导出风格一致

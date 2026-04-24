# React 组件架构规则

> React 组件组织与拆分规则，补充 `react-specific.md`。

---

## RC001：组件分类

- **Page 组件**：路由入口，放 `src/pages/`，仅负责布局与数据获取
- **Feature 组件**：业务组件，放 `src/features/<domain>/components/`
- **UI 组件**：通用无业务语义组件，放 `src/components/`
- **Layout 组件**：布局容器，放 `src/components/layouts/`

## RC002：组件粒度

- 单个组件文件 < 200 行，超过应拆分
- 一个组件只做一件事（单一职责）
- 复杂交互优先通过组合而非 Props 开关实现
- 禁止"万能组件"（通过大量 Props 控制多种形态）

## RC003：Props 设计

- Props 接口命名 `{ComponentName}Props`
- 可选 Props 显式声明默认值（`defaultValue = xxx`）
- 子元素传递优先用 `children` 而非 `renderXxx` Props
- 事件回调命名 `on{Event}`（`onChange`、`onSubmit`）
- 禁止用 Props 传递内部状态更新函数（应使用受控组件或 Context）

## RC004：状态归属

- UI 状态（hover、open、focus）留在组件内
- 表单状态用表单库（react-hook-form / Formik）
- 服务端数据用 React Query / SWR
- 跨组件共享使用 Context / Zustand / Jotai
- **禁止**将 UI 交互状态提升到全局

## RC005：副作用封装

- 所有 `useEffect` 应提取为自定义 Hook
- Hook 命名表达意图（`useDebounce` 而非 `useUtil`）
- 一个 Hook 只做一件事
- 副作用清理函数必须存在（避免内存泄漏）

## RC006：渲染优化

- 大列表使用虚拟滚动（`react-window` / `react-virtual`）
- `useMemo` / `useCallback` 使用时必须注释说明为何需要
- 禁止过早优化：先用 Profiler 证明瓶颈再优化
- 禁止在渲染函数中创建新引用（除非是稳定值）

## RC007：错误边界

- 路由级必须包裹 ErrorBoundary
- 关键业务组件（支付、上传）包裹局部 ErrorBoundary
- 错误信息不直接渲染给用户，显示友好 Fallback
- 错误上报统一走错误监控服务（Sentry / 自建）

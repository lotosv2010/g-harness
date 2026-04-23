# React 特定规则

> 适用于 React + Vite 项目的额外规则，补充 src/templates/.ai/rules/ 中的通用规则。

---

## RR001：组件规范

- 使用函数式组件，禁止 class 组件
- 组件文件名使用 PascalCase
- 每个文件只导出一个组件
- 组件 Props 使用 interface 定义，命名为 `{ComponentName}Props`

## RR002：Hook 规范

- 自定义 Hook 必须以 `use` 前缀命名
- Hook 文件名使用 camelCase
- 副作用逻辑封装到自定义 Hook 中，不直接写在组件内
- Hook 返回值优先使用对象（便于解构命名）

## RR003：状态管理

- 组件状态使用 `useState` / `useReducer`
- 跨组件共享使用 Context 或状态管理库
- 禁止将 UI 交互状态（modal open、tab index）提升到全局
- 服务端数据使用数据获取库（React Query / SWR），不手动管理

## RR004：性能

- 大列表使用虚拟滚动
- 昂贵计算使用 `useMemo`，需注释说明原因
- 回调函数传递给子组件时使用 `useCallback`，需注释说明原因
- 禁止在渲染路径中执行副作用

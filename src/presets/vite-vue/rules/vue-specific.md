# Vue 3 特定规则

> 适用于 Vue 3 + Vite 项目的额外规则，补充通用规则。

---

## VU001：组件规范

- 使用 `<script setup lang="ts">` 语法，禁止 Options API
- SFC 结构顺序：`<template>` → `<script setup>` → `<style scoped>`
- 组件文件名使用 PascalCase（如 `UserProfile.vue`）
- Props 使用 `defineProps` + interface 定义，命名为 `{ComponentName}Props`
- Emits 使用 `defineEmits` + interface 定义
- 每个 `.vue` 文件只包含一个组件

## VU002：Composable 规范

- 组合式函数必须以 `use` 前缀命名（如 `useAuth`、`usePagination`）
- 每个 composable 独立一个文件，文件名与函数名一致
- 返回值必须包含响应式数据（`ref` / `computed` / `reactive`）
- 副作用清理使用 `onUnmounted` 或返回 `stop` 函数
- 禁止在 composable 内部直接操作 DOM

## VU003：状态管理

- 简单状态使用 `ref` / `reactive`
- 跨组件共享使用 Pinia（`defineStore` + Composition API 风格）
- Pinia Store 文件放 `stores/` 目录，文件名与 store ID 一致
- 服务端数据获取封装到 composable 中，使用数据获取库或封装 `fetch`

## VU004：性能

- 非首屏组件使用 `defineAsyncComponent` 懒加载
- 路由使用 `vue-router` 懒加载（`() => import()`）
- 大列表使用虚拟滚动
- 避免在 `<template>` 中使用复杂表达式，提取为 `computed`

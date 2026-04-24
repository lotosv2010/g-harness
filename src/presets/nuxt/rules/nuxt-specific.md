# Nuxt 3 特定规则

> 适用于 Nuxt 3 全栈项目的额外规则，补充通用规则。

---

## NU001：组件规范

- 使用 `<script setup lang="ts">` 语法，禁止 Options API
- SFC 结构顺序：`<template>` → `<script setup>` → `<style scoped>`
- 组件文件名使用 PascalCase（如 `UserProfile.vue`）
- Props 使用 `defineProps` + interface 定义
- Emits 使用 `defineEmits` + interface 定义
- 每个 `.vue` 文件只包含一个组件

## NU002：Nuxt 约定式目录

- 页面组件放 `pages/` 目录，使用文件路由约定（不手动配置 vue-router）
- API 路由放 `server/api/` 目录，使用 `defineEventHandler` 定义
- 共享逻辑放 `composables/` 目录，Nuxt 自动导入
- 工具函数放 `utils/` 目录，Nuxt 自动导入
- 路由中间件放 `middleware/` 目录
- 服务端工具放 `server/utils/` 目录
- 布局组件放 `layouts/` 目录，页面通过 `definePageMeta({ layout: 'xxx' })` 指定
- 插件放 `plugins/` 目录，按 Nuxt 生命周期自动加载
- 禁止在 `pages/` 中嵌套业务逻辑，页面组件只做组合与布局

## NU003：Composable 规范

- 组合式函数必须以 `use` 前缀命名（如 `useAuth`、`usePagination`）
- 每个 composable 独立一个文件，文件名与函数名一致
- 返回值必须包含响应式数据（`ref` / `computed` / `reactive`）
- 入参优先使用 `MaybeRef<T>` 以兼容响应式与非响应式调用
- 副作用清理使用 `onUnmounted` 或返回 `stop` 函数
- 禁止在 composable 内部直接操作 DOM

## NU004：数据获取

- 服务端数据获取使用 `useFetch` / `useAsyncData`，禁止在 `onMounted` 中手动请求
- `useFetch` / `useAsyncData` 合理设置 `key` 和 `watch`，避免重复请求
- API 路由使用 `defineEventHandler`，参数校验使用 `getQuery` / `readBody`

## NU005：状态管理

- 简单跨组件状态使用 Nuxt 内置 `useState`（SSR 安全）
- 复杂业务状态使用 Pinia（`defineStore` + Composition API 风格）
- 禁止使用全局 `reactive()` 或模块级 `ref()` 作为共享状态（SSR 下会跨请求污染）
- Pinia Store 文件放 `stores/` 目录，文件名与 store ID 一致

## NU006：性能

- 非首屏组件使用 `defineAsyncComponent` 懒加载
- 仅客户端运行的组件使用 `.client.vue` 后缀
- 仅服务端渲染的组件使用 `.server.vue` 后缀
- 图片使用 `<NuxtImg>` / `<NuxtPicture>` 组件
- 路由跳转使用 `<NuxtLink>`，禁止使用 `<a>` 标签进行内部导航
- 大列表使用虚拟滚动，禁止一次性渲染超过 100 条 DOM 节点
- 避免在 `<template>` 中使用复杂表达式，提取为 `computed`

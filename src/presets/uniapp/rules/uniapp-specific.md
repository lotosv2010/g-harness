# uni-app 特定规则

> 适用于 uni-app + Vue 3 跨端项目的额外规则，补充通用规则。

---

## UA001：目录结构

- 页面放 `pages/` 目录，在 `pages.json` 中注册
- 分包页面放 `pages-sub/` 或按业务拆分子目录
- 公共组件放 `components/` 目录，使用 `easycom` 自动引入
- 工具函数放 `utils/`，API 封装放 `api/`
- 静态资源放 `static/`，大文件使用 CDN

## UA002：跨端兼容

- 平台差异代码使用条件编译：`// #ifdef MP-WEIXIN` / `// #endif`
- 禁止在公共代码中直接使用平台特有 API（如 `wx.xxx`）
- 使用 `uni.xxx` 统一 API，平台特有功能封装到独立模块并条件编译
- 样式使用 `rpx` 单位，禁止使用 `px`（H5 除外，可条件编译）
- 测试时覆盖至少两个目标平台（H5 + 小程序）

## UA003：组件规范

- 使用 `<script setup lang="ts">` + Composition API
- 组件文件名使用 PascalCase
- Props / Emits 使用 `defineProps` / `defineEmits` + interface
- 页面组件禁止嵌套复杂业务逻辑，拆分到 composable 和子组件

## UA004：性能

- 主包大小控制在 2MB 以内（小程序端）
- 合理使用分包加载和分包预下载
- 长列表使用虚拟列表或 `<recycle-list>`
- 图片使用 CDN + webp，启用懒加载
- 减少 `setData` 数据量（小程序端），避免频繁全量更新

## UA005：状态管理

- 使用 Pinia 管理全局状态
- 持久化存储使用 `uni.setStorageSync`，封装到统一工具中
- 禁止使用全局 `reactive()` 作为共享状态

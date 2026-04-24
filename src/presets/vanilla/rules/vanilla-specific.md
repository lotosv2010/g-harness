# 纯 HTML + JS 特定规则

> 适用于纯 HTML + JavaScript 静态项目的额外规则，补充通用规则。

---

## VN001：模块化

- 使用 ES Modules（`<script type="module">`），禁止全局 `<script>` 标签直接执行
- 每个功能模块独立一个 JS 文件，通过 `import/export` 组织
- 禁止全局变量污染，所有状态封装在模块作用域内
- 工具函数放 `src/utils/`，页面逻辑放 `src/pages/`

## VN002：HTML 规范

- 使用语义化标签（`<header>`、`<nav>`、`<main>`、`<section>`、`<article>`、`<footer>`）
- 每个页面必须声明 `<!DOCTYPE html>` 和 `<html lang="...">`
- 图片必须包含 `alt` 属性
- 表单元素必须关联 `<label>`

## VN003：CSS 规范

- 使用外部样式表，禁止行内样式（`style=""`）
- CSS 文件按模块组织，与对应 JS 文件同目录
- 类名使用 kebab-case（如 `user-card`、`nav-item`）
- 优先使用 CSS 自定义属性（`--color-primary`）管理主题变量
- 响应式布局优先使用 Flexbox / Grid，避免固定像素宽度

## VN004：性能

- 图片使用合适格式（WebP 优先）并设置宽高属性
- JS 文件使用 `defer` 或 `type="module"` 加载，避免阻塞渲染
- 关键 CSS 内联到 `<head>`，非关键样式异步加载
- 静态资源使用合理的缓存策略

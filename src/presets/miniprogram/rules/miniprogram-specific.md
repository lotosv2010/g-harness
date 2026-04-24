# 微信小程序特定规则

> 适用于微信小程序项目的额外规则，补充通用规则。

---

## MP001：目录与文件

- 页面放 `pages/` 目录，每个页面一个独立目录（含 `.wxml`、`.wxss`、`.ts`、`.json`）
- 公共组件放 `components/` 目录，每个组件一个独立目录
- 页面必须在 `app.json` 的 `pages` 数组中注册
- 分包页面放 `subpackages/` 或 `packages/` 目录，在 `app.json` 的 `subPackages` 中配置
- 静态资源放 `assets/` 目录，大文件使用 CDN 引用（主包限制 2MB）

## MP002：组件规范

- 使用 `Component` 构造器定义自定义组件，禁止在组件中使用 `Page` 构造器
- 组件 properties 必须声明类型和默认值
- 组件间通信使用 `triggerEvent`（子到父）和 properties（父到子）
- 跨组件通信使用 `getApp()` 全局状态或事件总线，禁止直接操作其他组件实例
- 组件样式使用 `styleIsolation: 'isolated'`，避免样式泄露

## MP003：数据与接口

- 网络请求统一封装在 `api/` 目录，基于 `wx.request` 二次封装
- 请求封装必须包含：超时处理、错误统一处理、Token 自动携带、请求/响应拦截
- 本地存储使用 `wx.setStorageSync` / `wx.getStorageSync`，封装到 `utils/storage.ts`
- 敏感数据（Token、用户信息）存储时考虑加密
- 禁止在页面逻辑中直接调用 `wx.request`

## MP004：性能

- 主包大小控制在 2MB 以内，总包不超过 20MB
- 合理使用分包加载（`subPackages`）和分包预下载（`preloadRule`）
- 长列表使用虚拟列表或 `recycle-view` 组件
- 图片使用 CDN + webp 格式，启用懒加载（`lazy-load`）
- `setData` 调用最小化数据量，禁止整个对象全量更新
- 频繁触发的事件（scroll、input）使用节流/防抖

## MP005：安全

- 用户敏感操作（支付、获取手机号）必须在服务端校验
- 禁止在前端存储或传输明文密码
- 接口请求必须使用 HTTPS
- 小程序码和二维码生成在服务端完成，禁止前端拼接
- 使用 `wx.getAccountInfoSync` 区分开发/体验/正式版，控制调试信息输出

## MP006：审核合规

- 页面内容必须符合微信小程序运营规范
- 用户隐私数据获取前必须展示隐私协议弹窗
- 禁止通过小程序跳转到未备案的外部链接
- 页面路径和参数禁止包含敏感关键词

# React Native 特定规则

> 适用于 React Native + Expo 移动应用项目的额外规则，补充通用规则。

---

## RN001：组件规范

- 使用函数式组件，禁止 class 组件
- 组件文件名使用 PascalCase
- 每个文件只导出一个组件
- 组件 Props 使用 interface 定义，命名为 `{ComponentName}Props`
- 平台特定组件使用 `.ios.tsx` / `.android.tsx` 后缀

## RN002：样式规范

- 样式使用 `StyleSheet.create()` 定义，放在文件底部
- 禁止在 JSX 中使用内联样式对象（`style={{ ... }}`），避免每次渲染创建新对象
- 主题变量集中定义在 `src/shared/theme.ts`
- 响应式布局使用 `useWindowDimensions` 或 `Dimensions` API
- 禁止使用百分比单位做精确布局，优先使用 Flex

## RN003：导航

- 使用 Expo Router（文件路由）或 React Navigation
- Screen 组件放 `app/` 目录（Expo Router）或 `src/screens/` 目录
- 导航参数使用 TypeScript 类型定义（`RootStackParamList`）
- 深层链接（Deep Link）配置集中管理，禁止分散硬编码

## RN004：原生交互

- 优先使用 Expo SDK 模块，避免直接依赖原生代码
- 必须使用原生模块时，通过 Expo Modules API 或 Config Plugin 集成
- 权限请求统一封装到 `src/shared/permissions.ts`，调用前检查权限状态
- 原生事件监听在组件卸载时必须清理

## RN005：性能

- 长列表使用 `FlashList`（推荐）或 `FlatList`，禁止 `ScrollView` 渲染大量数据
- 列表项使用 `React.memo` 包裹，提供稳定的 `keyExtractor`
- 图片使用 `expo-image` 或 `FastImage`，启用缓存
- 动画使用 `react-native-reanimated`，运行在 UI 线程
- 禁止在渲染路径中执行重计算，使用 `useMemo` / `useCallback`
- JS 桥通信频繁的场景考虑使用 JSI（Turbo Modules）

## RN006：构建与发布

- 使用 EAS Build 进行云端构建，本地构建仅用于调试
- 环境变量通过 `eas.json` 的 `env` 配置，禁止硬编码
- OTA 更新使用 `expo-updates`，配置更新策略（启动时检查 / 后台静默）
- 应用图标和启动屏使用 Expo 配置（`app.json` 的 `icon` / `splash`）

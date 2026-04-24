# Flutter 特定规则

> 适用于 Dart + Flutter 跨端移动应用项目的额外规则，补充通用规则。

---

## FL001：目录结构（Feature-First）

- 按功能模块组织代码：`lib/features/<feature>/`
- 每个 feature 包含：`presentation/`（Widget）、`domain/`（业务逻辑）、`data/`（数据源）
- 公共核心放 `lib/core/`（主题、路由、常量、工具类）
- 数据层放 `lib/data/`（API client、Repository 实现、DTO）
- 入口文件为 `lib/main.dart`

## FL002：Widget 规范

- Widget 保持小粒度，单个 Widget 文件不超过 150 行
- `StatelessWidget` 优先，仅在需要生命周期时使用 `StatefulWidget`
- 使用 `const` 构造函数优化重建性能
- Widget 参数使用 `required` 标注必填字段
- 复杂 Widget 树拆分为独立的私有 Widget 方法或子文件

## FL003：状态管理

- 推荐使用 Riverpod 或 Bloc，全项目统一一种方案
- 全局状态通过 Provider / BlocProvider 注入
- 页面级状态使用 `StateNotifier` / `Cubit`，不使用全局状态
- 禁止在 Widget 树中直接管理异步状态（使用 `AsyncNotifier` / `AsyncValue`）
- 状态变更必须通过定义好的事件（Bloc）或方法（Riverpod）触发

## FL004：数据层

- API 请求封装在 `lib/data/api/` 目录，使用 dio 或 http 包
- 数据模型使用 `freezed` + `json_serializable` 代码生成
- Repository 模式：domain 层定义接口，data 层实现
- 错误处理使用 `Either<Failure, T>` 或 `sealed class Result<T>`
- 禁止在 Widget 层直接调用 API

## FL005：导航

- 使用 `go_router` 或 `auto_route` 管理路由
- 路由路径集中定义在 `lib/core/router/` 目录
- 路由参数使用类型安全的 `$extra` 或 typed route
- 深层链接配置在路由表中统一管理

## FL006：性能

- 列表使用 `ListView.builder` / `GridView.builder`，禁止直接 `ListView(children: [...])`
- 图片使用 `cached_network_image` 启用缓存
- 构建方法中避免创建新对象，使用 `const` Widget
- 动画使用 `AnimatedBuilder` / `AnimatedWidget`，避免不必要的 `setState`
- 使用 DevTools 的 Performance 面板检测 jank

## FL007：测试

- Widget 测试放 `test/` 目录，与 `lib/` 镜像结构
- 关键业务逻辑必须有单元测试
- Widget 测试使用 `testWidgets` + `find` + `expect`
- 集成测试放 `integration_test/` 目录
- Mock 使用 `mocktail` 或 `mockito`

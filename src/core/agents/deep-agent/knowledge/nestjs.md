# NestJS 知识库

## 推荐分层
- 按领域切 Module：`modules/<domain>/{controller,service,repository,dto}`
- `shared/` 放跨模块工具；`interceptors/`、`guards/`、`pipes/` 顶层复用

## 关键约束
- Controller 不直接访问数据库，必须经 Service
- DTO 使用 `class-validator` 装饰器校验
- 事务统一在 Service 层；Repository 无副作用

## 常见陷阱
- 循环依赖：两个 Module 相互 inject 会炸 → 拆分共同依赖到 shared
- Guard / Interceptor 顺序混乱：注册顺序决定执行顺序
- 在 lifecycle hook 里做重 IO → 应懒初始化

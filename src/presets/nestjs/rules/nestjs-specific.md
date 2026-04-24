# NestJS 特定规则

> 适用于 NestJS 后端服务项目的额外规则，补充通用规则。

---

## NS001：模块组织

- 每个业务领域一个 Module（`@Module`），包含 Controller、Service、Entity
- Module 目录结构：`modules/<name>/`，包含 `<name>.module.ts`、`<name>.controller.ts`、`<name>.service.ts`
- 公共逻辑放 `src/common/`（装饰器、守卫、拦截器、管道、过滤器）
- 跨模块调用通过 Module 的 `exports` 显式暴露，禁止直接导入其他模块的内部文件
- `AppModule` 只注册顶层模块，不直接声明 Controller 或 Provider

## NS002：依赖注入

- 所有 Service 使用 `@Injectable()` 装饰器，通过构造函数注入依赖
- 禁止在 Service 中手动实例化依赖（`new XxxService()`）
- 自定义 Provider 使用 `useClass`、`useFactory` 或 `useValue`，不使用字面量注入
- 循环依赖使用 `forwardRef()` 解决，并附注释说明原因

## NS003：请求处理

- Controller 仅负责路由定义、参数绑定和响应格式化，禁止包含业务逻辑
- 请求校验使用 DTO + `class-validator` 装饰器 + `ValidationPipe`
- 创建和更新使用独立 DTO（`CreateXxxDto`、`UpdateXxxDto`），通过 `PartialType` / `PickType` 派生
- 统一响应格式使用 Interceptor，统一异常格式使用 ExceptionFilter
- 路由参数使用 `@Param()`、`@Query()`、`@Body()` 显式绑定，禁止直接读 `req`

## NS004：数据库

- ORM 操作封装在 Repository 或 Service 层，Controller 禁止直接操作数据库
- Entity 定义使用装饰器（TypeORM：`@Entity`；Prisma：使用 schema.prisma）
- 数据库迁移纳入版本控制，禁止手动修改已执行的迁移
- 事务操作在 Service 层协调，使用 `DataSource.transaction()` 或 Prisma `$transaction`

## NS005：安全

- 认证使用 Guard（`@UseGuards`），授权使用自定义装饰器 + Guard
- 速率限制使用 `@nestjs/throttler`，敏感端点单独配置更严格限制
- CORS 显式配置允许的 origin，禁止生产环境 `origin: '*'`
- 错误响应禁止暴露内部堆栈，使用 ExceptionFilter 统一处理

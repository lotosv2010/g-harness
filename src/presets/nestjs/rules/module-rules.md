# NestJS Module 架构规则

> NestJS Module 组织与依赖注入规则，补充 `nestjs-specific.md`。

---

## NM001：Module 边界

- 每个业务领域对应一个 Module，放在 `src/modules/<domain>/`
- Module 文件命名 `<domain>.module.ts`
- Module 只导出其他 Module 需要使用的 Provider，内部实现不对外暴露
- 禁止出现 God Module（单个 Module 引入 10+ Provider）

## NM002：依赖注入

- 所有 Service 使用 `@Injectable()` 装饰
- 跨 Module 依赖通过 `imports` 声明，不直接 `new` 另一个模块的类
- 循环依赖禁止；如确需双向引用，重构为事件驱动或共享基础模块
- 使用接口注入时以 `Symbol` 作为 token，避免裸字符串

## NM003：Controller 职责

- Controller 仅负责：参数解析、权限校验（经由 Guard）、响应序列化
- Controller 禁止包含业务逻辑（如查询拼装、跨模块调用）
- 业务逻辑放 Service，多步骤流程放 Orchestrator Service
- 一个 Controller 对应一个资源，嵌套资源使用路径参数

## NM004：DTO 与验证

- 请求 DTO 使用 class + `class-validator` 装饰器
- 响应 DTO 单独定义（不复用请求 DTO），避免泄露内部字段
- 全局启用 `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
- 复杂业务规则放 Domain Service 而非 DTO 装饰器

## NM005：异常处理

- 业务异常抛 `HttpException` 子类（`NotFoundException`、`ForbiddenException` 等）
- 未预期异常由全局 `ExceptionFilter` 捕获并记录
- 异常消息不泄露内部实现细节（如 SQL、路径）
- 禁止 `try { ... } catch { /* 忽略 */ }` 吞异常

## NM006：Repository 与数据层

- 数据访问通过 Repository 层封装，Service 不直接使用 ORM 查询构建器
- 跨领域查询通过 Orchestrator Service 组合多个 Repository
- 事务通过装饰器（`@Transactional`）或显式 QueryRunner 管理
- 禁止在 Controller 中注入 Repository

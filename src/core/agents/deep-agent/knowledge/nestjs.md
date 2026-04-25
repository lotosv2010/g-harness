# NestJS 预设知识库

> 供 Deep Agent 生成规范文件时参考的 NestJS 领域知识。
> 版本取向：NestJS 10+；TypeScript strict；Express 或 Fastify 适配器均可。

## 技术栈定位

NestJS 是受 Angular 启发的 Node.js 服务端框架，核心概念：模块（Module）/ 控制器（Controller）/ 提供者（Provider）/ 依赖注入（DI）/ 中间件 / 管道 / 守卫 / 拦截器 / 过滤器。
适合中大型企业后端，强调分层、可测试、可组合。

**典型心智模型**：
- 一切皆为模块；模块边界即部署/测试边界
- Provider 通过构造函数注入，不直接 `new`
- 请求生命周期：Middleware → Guard → Interceptor(pre) → Pipe → Handler → Interceptor(post) → Exception Filter

## 标准分层

```
src/
├── main.ts                     # 启动入口，创建 Nest App
├── app.module.ts               # 根模块
├── config/                     # 配置与 Zod 校验
│   └── env.schema.ts
├── common/                     # 横切关注点
│   ├── decorators/
│   ├── filters/                # HttpExceptionFilter 等
│   ├── guards/                 # AuthGuard / RolesGuard
│   ├── interceptors/           # LoggingInterceptor / TransformInterceptor
│   ├── pipes/                  # ValidationPipe 扩展
│   └── dto/                    # 跨模块共享 DTO（少）
├── infra/                      # 外部世界适配
│   ├── database/               # ORM module（TypeORM / Prisma）
│   ├── cache/                  # Redis / Cache-Manager
│   ├── queue/                  # BullMQ
│   ├── storage/                # S3 / OSS 适配
│   └── http/                   # 外部 API client
├── modules/                    # 业务模块（按领域切）
│   └── users/
│       ├── users.module.ts
│       ├── users.controller.ts
│       ├── users.service.ts
│       ├── users.repository.ts
│       ├── dto/
│       │   ├── create-user.dto.ts
│       │   └── update-user.dto.ts
│       ├── entities/user.entity.ts
│       └── users.service.spec.ts
└── shared/                     # 类型 / 工具（不可被 controller 依赖）
```

**关键边界**：
- Controller 只做 HTTP 适配（DTO in → service 调用 → DTO out）
- Service 承担业务逻辑，不直接碰 ORM；经由 Repository
- Repository 封装持久化，返回 entity 或纯对象
- 跨模块调用经由 `exports`；禁止直接 import 别的模块 service

## DI 与模块

- Provider 默认 singleton；需要请求作用域时显式 `@Injectable({ scope: Scope.REQUEST })`
- `forRoot` / `forRootAsync` 供基础设施模块（数据库、缓存等），业务模块用 `forFeature`
- Token 注入：字符串 token 统一 `export const` 定义（如 `USER_REPOSITORY`），避免 magic string

## 校验与 DTO

- `class-validator` + `class-transformer` 是官方推荐，但 Zod 也可通过 `nestjs-zod` 适配
- `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` 全局默认
- DTO 永远是 class（装饰器需要），不得用 interface
- 响应 DTO 与请求 DTO 分离，避免"输入即输出"

## 异常与日志

- 业务异常抛 `HttpException` 子类；非 HTTP 语义抛自定义 `DomainError` 由 Filter 转换
- Logger：用内置 `Logger`；结构化日志走 `nestjs-pino` 或 `winston`
- 全局 Filter 统一响应格式：`{ code, message, data, traceId }`

## 常见陷阱

1. **循环依赖**：A ↔ B 模块互引；Nest 会报警告但仍注入 undefined。用 `forwardRef` 或重构边界
2. **全局管道 + DTO transform 冲突**：`whitelist` 开启后未标记 `@Expose` 字段被剥离
3. **请求作用域 Provider 穿透**：一旦某 provider scope=REQUEST，其依赖链全部变成请求作用域，性能骤降
4. **多数据源**：默认 `@InjectRepository` 绑定默认连接，多库时要指定连接名
5. **测试时 mock 边界**：优先 mock service / repository，不要 mock HTTP 层
6. **微服务 vs HTTP**：`@MessagePattern` 与 `@Post` 不可共用 controller
7. **TypeORM + Prisma 混用**：两个 ORM 并存时事务边界混乱，必须二选一

## 推荐 rules

- **R-NEST-01**：Controller 禁止直接调用 ORM；必须经由 Service
- **R-NEST-02**：Service 禁止直接 import 其他模块的 Service；通过 module `exports` 暴露接口
- **R-NEST-03**：所有外部输入走 DTO + ValidationPipe；禁止直接读取 `req.body`
- **R-NEST-04**：Env 变量通过 `ConfigService.get(...)` 访问，启动时 Zod 校验，非法值阻断启动
- **R-NEST-05**：禁止在 controller/service 中 `console.log`，统一用 `Logger`
- **R-NEST-06**：每个业务模块必须有 `*.service.spec.ts`；控制器测试可选
- **R-NEST-07**：数据库迁移使用 migration 文件，禁止 `synchronize: true` 生产环境

## 推荐 protocols

- **新增业务模块**：CLI `nest g resource xxx` → 审查生成脚手架 → 补 DTO/entity/repo → 写 service 测试
- **新增跨模块功能**：优先定义 interface + token；实现模块 `exports`，消费模块 `imports`
- **迁移到微服务**：先把业务 logic 从 controller 下沉到 service；再加 `@MessagePattern`

## 推荐 ADR 主题

- `ORM 选型`（TypeORM / Prisma / MikroORM）
- `HTTP 适配器`（Express vs Fastify）
- `认证方案`（Passport + JWT / OAuth2 / Session）
- `微服务通讯`（gRPC / NATS / Kafka）
- `配置与密钥管理`

## 监控与运维

- Health check：`@nestjs/terminus`，暴露 `/health` + 依赖项（db/redis/external）
- OpenTelemetry：`@opentelemetry/instrumentation-nestjs-core` 自动追踪
- 指标：Prometheus + `@willsoto/nestjs-prometheus`
- 错误：Sentry（`@sentry/node` + 自定义 ExceptionFilter 上报）

## 测试策略

- 单元：每个 Service 独立 spec，Repository mock
- 集成：`Test.createTestingModule()` + in-memory SQLite 或 testcontainers
- E2E：`supertest` + 真实 AppModule，覆盖关键路由
- 覆盖率门槛：service ≥ 80%，controller 可宽松

## 代码骨架示例

### Env Schema（config/env.schema.ts）

```ts
import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Env 校验失败: ' + JSON.stringify(parsed.error.flatten()))
  }
  return parsed.data
}
```

### 标准 Controller 骨架

```ts
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    const user = await this.users.findById(id)
    if (!user) throw new NotFoundException()
    return UserDto.fromEntity(user)
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return UserDto.fromEntity(await this.users.create(dto))
  }
}
```

### 全局响应拦截器

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({ code: 0, message: 'ok', data, traceId: getTraceId(ctx) })),
    )
  }
}
```

## 发布检查清单

- [ ] 所有 `synchronize: false`，迁移已 run
- [ ] JWT_SECRET / DB 密码轮换 + 存 secret manager
- [ ] Helmet / CORS / Rate-limit 全部启用
- [ ] Swagger 仅开发启用（或鉴权保护）
- [ ] Prometheus `/metrics` 被反代拦截（仅内网访问）
- [ ] 健康检查路径接入 LB / k8s probe
- [ ] 日志级别生产 = info；敏感字段打码
- [ ] CI `--coverage` 阈值通过

## AI 生成规范时的自查清单

生成 NestJS 项目规范前，Agent 应确认：

1. HTTP 适配器是 Express 还是 Fastify？关系到中间件选型与性能上限
2. 是否存在 `@nestjs/microservices` 依赖？存在即需在 SPEC 中单独标记"微服务边界"
3. ORM 痕迹：`src/**/*.entity.ts`（TypeORM）/ `prisma/schema.prisma`（Prisma）/ `src/**/*.model.ts`（Mongoose）？按痕迹定结论
4. `main.ts` 是否启用 GlobalPipes / GlobalFilters / GlobalInterceptors？未启用则规则要标为"新增"
5. 是否有 `@nestjs/config` + Joi/Zod 校验？缺失即需补
6. 模块是否按领域切分，还是按技术（controllers/ services/ 全扁平）？按实际结构出规则
7. 是否存在 `@nestjs/swagger`？有则 DTO 装饰器约束更严
8. CQRS / Event Sourcing 痕迹（`@nestjs/cqrs` 导入）？有则分层规则需扩展

## 与其他预设的对照要点

- 与 **FastAPI**：依赖注入哲学同源，DTO 分离、repository pattern 都一致；主要差异在 async 强制性（FastAPI 天然，Nest 可选）
- 与 **Next.js Route Handlers**：Nest 是"后端优先"，适合独立部署；Next 的 API 仅适合 BFF 规模
- 与 **Express**：Nest 是 Express 的结构化升级，迁移路径顺滑，但 DI + 装饰器的思维切换需要培训

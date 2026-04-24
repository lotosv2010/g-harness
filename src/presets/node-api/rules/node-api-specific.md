# Node.js API 特定规则

> 适用于 Node.js API 服务项目的额外规则，补充 src/templates/.ai/rules/ 中的通用规则。

---

## NA001：分层架构

- 严格遵循四层调用链：`routes/` → `controllers/` → `services/` → `repositories/`
- **routes/**：路由入口，仅负责路径定义与中间件挂载，不含业务逻辑
- **controllers/**：请求处理层，负责参数校验、调用 service、组装响应
- **services/**：业务逻辑层，负责核心业务规则、事务协调、跨模块调用
- **repositories/**：数据访问层，负责数据库查询、ORM 操作、外部数据源对接
- 禁止跨层调用：controller 不得直接调用 repository，route 不得直接调用 service
- 每层只依赖其直接下层，不反向依赖上层

```
routes/user.route.ts        → 定义 GET /users/:id，挂载 auth 中间件
controllers/user.controller.ts → 校验参数，调用 userService.findById()
services/user.service.ts       → 执行业务规则，调用 userRepository.findById()
repositories/user.repository.ts → 执行数据库查询，返回实体
```

## NA002：错误处理

- 使用统一的错误处理中间件，挂载在路由链末尾
- 定义自定义 `AppError` 类，包含 `statusCode`、`code`（业务错误码）、`message` 字段
- HTTP 状态码使用规范：
  - `400` 参数校验失败
  - `401` 未认证
  - `403` 无权限
  - `404` 资源不存在
  - `409` 资源冲突
  - `422` 业务规则校验失败
  - `500` 服务器内部错误
- 禁止吞掉错误：catch 块必须记录日志或向上抛出
- service 层抛出 `AppError`，controller 层不捕获（由统一中间件处理）
- 异步路由处理函数必须用 wrapper 捕获 Promise rejection，防止未处理异常

```typescript
// 正确：统一错误类
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 正确：异步包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
```

## NA003：请求校验

- 所有请求参数（body、query、params）必须使用 zod 或 joi 进行 schema 校验
- 校验逻辑在 controller 层执行，校验失败立即返回 400 响应
- 禁止 service 层假定参数合法——但 service 层不重复校验，职责在 controller
- 校验 schema 独立定义在 `schemas/` 或 `validators/` 目录，不内联在 controller 中
- 复用校验逻辑：相同实体的创建与更新 schema 通过 `.partial()` / `.pick()` 派生

```typescript
// 正确：独立 schema 定义
// schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// 正确：controller 层校验
export function createUser(req: Request, res: Response, next: NextFunction) {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', result.error.message);
  }
  // 传递校验后的数据给 service
  const user = await userService.create(result.data);
  res.status(201).json({ data: user });
}
```

## NA004：安全规范

- **CORS**：必须显式配置允许的 origin 列表，禁止生产环境使用 `origin: '*'`
- **Rate Limiting**：所有公开端点必须配置速率限制，登录/注册等敏感端点单独设置更严格的限制
- **Helmet**：启用 helmet 中间件设置安全 HTTP 头（CSP、HSTS、X-Frame-Options 等）
- **错误堆栈**：禁止将内部错误堆栈（stack trace）返回客户端，仅在开发环境下可选输出
- **日志脱敏**：日志中禁止输出密码、Token、身份证号等敏感字段，使用脱敏函数处理
- **请求体限制**：配置请求体大小上限，防止大 payload 攻击
- **SQL 注入**：所有数据库查询必须使用参数化查询或 ORM，禁止字符串拼接 SQL

```typescript
// 正确：生产环境 CORS 配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [],
  credentials: true,
  maxAge: 86400,
};

// 正确：错误响应不暴露堆栈
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: { code, message: err.message },
    // 仅开发环境输出堆栈
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

## NA005：数据库规范

- ORM（Prisma / Drizzle / TypeORM）或查询构建器（Knex）的调用必须封装在 repository 层
- 禁止 controller 或 service 直接编写原始 SQL 或直接调用 ORM client
- 事务由 service 层协调：service 开启事务并将事务上下文传递给 repository 方法
- 数据库连接使用连接池，配置合理的 pool size（根据并发量调整）
- 数据库迁移文件纳入版本控制，禁止手动修改已执行的迁移
- 查询必须使用参数绑定，禁止字符串拼接构建查询条件

```typescript
// 正确：repository 封装数据访问
// repositories/user.repository.ts
export function findById(id: string) {
  return db.user.findUnique({ where: { id } });
}

export function create(data: CreateUserData, tx?: Transaction) {
  const client = tx ?? db;
  return client.user.create({ data });
}

// 正确：service 层协调事务
// services/user.service.ts
export async function createWithProfile(data: CreateUserInput) {
  return db.$transaction(async (tx) => {
    const user = await userRepository.create(data.user, tx);
    await profileRepository.create({ userId: user.id, ...data.profile }, tx);
    return user;
  });
}
```

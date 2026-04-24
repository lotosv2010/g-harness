# 轻量 Node.js API 特定规则

> 适用于 Express / Fastify / Hono 等轻量 Node.js API 项目的额外规则，补充通用规则。

---

## EX001：分层架构

- 遵循三层调用链：`routes/` → `controllers/` → `services/`
- **routes/**：路由入口，仅负责路径定义与中间件挂载
- **controllers/**：请求处理层，负责参数校验、调用 service、组装响应
- **services/**：业务逻辑层，负责核心业务规则和数据访问
- 禁止跨层调用：route 不得直接调用 service，controller 不得直接操作数据库
- 复杂项目可增加 repositories/ 层拆分数据访问

## EX002：错误处理

- 使用统一的错误处理中间件，挂载在路由链末尾
- 定义 `AppError` 类，包含 `statusCode`、`code`（业务码）、`message`
- service 层抛出 `AppError`，由统一中间件捕获处理
- 异步路由使用包装函数捕获 Promise rejection
- 错误响应禁止暴露内部堆栈，仅开发环境可选输出

## EX003：请求校验

- 所有请求参数使用 zod 或 joi 进行 schema 校验
- 校验逻辑在 controller 层执行
- 校验 schema 独立定义在 `schemas/` 或 `validators/` 目录
- 复用校验逻辑：创建与更新 schema 通过 `.partial()` / `.pick()` 派生

## EX004：安全

- CORS 显式配置允许的 origin，禁止生产环境 `origin: '*'`
- 所有公开端点配置速率限制
- 启用 helmet 中间件设置安全 HTTP 头
- 错误响应禁止返回堆栈信息
- 日志中禁止输出密码、Token 等敏感字段
- 请求体大小设置上限

## EX005：数据库

- 数据库操作封装在 service 层或独立的 repository 层
- 所有查询使用参数化查询或 ORM，禁止字符串拼接 SQL
- 数据库迁移纳入版本控制
- 连接使用连接池，配置合理的 pool size

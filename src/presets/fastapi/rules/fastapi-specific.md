# FastAPI 特定规则

> 适用于 Python FastAPI 后端服务项目的额外规则，补充通用规则。

---

## FA001：项目结构

- 应用入口放 `app/main.py`，创建 FastAPI 实例并注册路由
- 路由按领域拆分到 `app/api/routes/` 目录，每个文件一个 `APIRouter`
- 业务逻辑放 `app/modules/`，每个模块包含 `service.py`、`models.py`、`schemas.py`
- 公共工具放 `app/common/`（异常、依赖注入、中间件）
- 核心配置放 `app/core/`（settings、database、security）

## FA002：请求与响应

- 请求体和响应体使用 Pydantic v2 模型（`BaseModel`）定义
- 创建和更新使用独立 Schema（`CreateXxxSchema`、`UpdateXxxSchema`）
- 响应模型通过 `response_model` 参数指定，禁止直接返回 ORM 对象
- 参数校验使用 Pydantic 的 `Field` 和自定义 validator
- 分页响应使用统一的 `PaginatedResponse[T]` 泛型模型

## FA003：依赖注入

- 使用 FastAPI 的 `Depends` 进行依赖注入
- 数据库 session 通过 `Depends(get_db)` 注入
- 认证信息通过 `Depends(get_current_user)` 注入
- 公共依赖放 `app/common/deps.py`
- 禁止在路由函数中直接实例化 service 或 repository

## FA004：数据库

- ORM 使用 SQLAlchemy 2.0+（async）或 Tortoise ORM
- 数据库操作封装在 repository 层，service 层调用 repository
- 迁移使用 Alembic，迁移文件纳入版本控制
- 连接池通过 `app/core/database.py` 统一配置
- 禁止在路由函数中直接编写 SQL

## FA005：安全

- CORS 使用 `CORSMiddleware`，显式配置允许的 origin
- 认证使用 OAuth2 + JWT，Token 生成和校验封装在 `app/core/security.py`
- 密码使用 bcrypt 哈希，禁止明文存储
- 速率限制使用 `slowapi` 或中间件实现
- 敏感配置通过环境变量加载（`pydantic-settings`），禁止硬编码

## FA006：异步规范

- 路由函数使用 `async def`，I/O 操作使用 `await`
- CPU 密集型任务使用 `run_in_executor` 或后台任务（`BackgroundTasks`）
- 禁止在异步上下文中调用同步阻塞函数
- 长时间任务使用 Celery 或 ARQ 异步队列处理

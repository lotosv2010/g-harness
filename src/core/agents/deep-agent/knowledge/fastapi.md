# FastAPI 预设知识库

> 供 Deep Agent 生成规范文件时参考的 FastAPI 领域知识。
> 版本取向：FastAPI 0.110+ / Pydantic v2 / Python 3.11+。

## 技术栈定位

FastAPI 是基于 Starlette + Pydantic 的现代 Python 异步 Web 框架。核心卖点：类型驱动的参数校验、自动 OpenAPI、原生 async、依赖注入。适合中大型 API 服务，可与 SQLAlchemy 2.x async / SQLModel / Prisma Python 组合。

**典型心智模型**：
- 路由函数的类型注解即契约，Pydantic 自动校验 + 序列化
- `Depends()` 是依赖注入链；请求作用域的资源（DB session）经它分发
- `async def` 是一等公民；同步 IO 函数会阻塞事件循环，需下沉到 `run_in_threadpool`

## 标准分层

```
src/
├── main.py                     # FastAPI app 实例 + lifespan
├── core/
│   ├── config.py               # pydantic-settings
│   ├── security.py             # 密码、JWT
│   ├── logging.py              # structlog / loguru 配置
│   └── middleware.py
├── api/
│   ├── deps.py                 # 共用依赖（get_db, get_current_user）
│   └── v1/
│       ├── __init__.py         # include_router
│       ├── users.py            # /users 路由
│       └── orders.py
├── domain/                     # 纯业务对象（dataclass / Pydantic）
│   ├── entities/
│   └── exceptions.py
├── services/                   # 业务服务，不碰 HTTP
│   ├── user_service.py
│   └── order_service.py
├── repositories/               # 持久化抽象
│   ├── base.py
│   └── user_repository.py
├── db/
│   ├── session.py              # AsyncSession maker
│   ├── models.py               # SQLAlchemy ORM
│   └── migrations/             # alembic
├── schemas/                    # Pydantic 请求/响应 DTO
│   ├── user.py
│   └── common.py
└── tasks/                      # Celery / arq / APScheduler
```

**关键边界**：
- 路由仅做 HTTP 适配；业务逻辑在 service
- service 不知 HTTP；只接受/返回 domain 对象或 DTO
- repository 封装 ORM；service 不直接操作 AsyncSession（除了事务边界）
- schemas/ ≠ db/models；DTO 与 ORM model 必须分离

## 依赖注入

- `Depends(get_db)`：AsyncSession lifetime = 请求
- `Depends(get_current_user)`：鉴权 + 用户查询链
- 依赖可组合：`def admin_user(user = Depends(get_current_user))`
- 全局依赖：`app = FastAPI(dependencies=[Depends(...)])`，如速率限制、追踪
- 单元测试：`app.dependency_overrides[dep] = fake_dep`

## 数据与 ORM

- **SQLAlchemy 2.x async**：`sessionmaker(class_=AsyncSession)` + `async with`
- **SQLModel**：Pydantic + SQLAlchemy 合一，写法简洁但类型边界模糊
- **Prisma Python**：生态较新，schema.prisma 驱动
- **事务**：service 层用 `async with session.begin():` 显式边界
- **迁移**：Alembic + `async` template；禁止 `create_all` 生产环境

## 鉴权与安全

- `OAuth2PasswordBearer` + JWT 是默认模板；密码用 `passlib[bcrypt]`
- RBAC：依赖链组合（`admin_user` / `staff_user`）
- CORS：`CORSMiddleware` 显式 origin 白名单
- Rate limit：`slowapi` 或 Redis-based
- HTTPS：生产部署在反向代理后（Nginx / Traefik / Caddy），app 无需 TLS

## 常见陷阱

1. **同步 IO 阻塞事件循环**：`requests.get()` / `time.sleep()` 在 async 里仍阻塞；用 `httpx.AsyncClient` / `asyncio.sleep`
2. **Pydantic v1 vs v2 语法**：`.dict()` → `.model_dump()`，`Config` 内部类 → `model_config = ConfigDict(...)`
3. **ORM session 跨请求泄漏**：全局 session 是 bug；必须请求作用域
4. **响应序列化耗时**：复杂 Pydantic model 序列化慢；用 `response_model_exclude_none` + 字段精简
5. **懒加载在 async ORM 崩**：`selectinload` / `joinedload` 显式预加载
6. **环境变量类型**：直接 `os.getenv` 返回 str；用 `pydantic-settings` 强类型
7. **worker 数量与 CPU 绑定**：async 单 worker 单核；I/O bound 多 worker，CPU bound 加 threadpool

## 推荐 rules

- **R-FA-01**：路由函数必须有完整类型注解（入参 + 返回类型）
- **R-FA-02**：业务逻辑在 service；禁止在路由函数里超过 10 行逻辑
- **R-FA-03**：数据库访问必须经 repository；禁止 service 里写 `select(Model)`
- **R-FA-04**：配置通过 `pydantic-settings.BaseSettings` 读取；禁止散落 `os.getenv`
- **R-FA-05**：异常统一走 `HTTPException` 或自定义 domain exception + exception handler
- **R-FA-06**：响应 DTO 必须 `response_model=` 显式声明，不依赖 return 类型推断
- **R-FA-07**：所有 async 路由中的 I/O 必须 awaitable；同步库下沉到 `run_in_threadpool`
- **R-FA-08**：Alembic migration 入库；禁止生产 `Base.metadata.create_all`

## 推荐 protocols

- **新增接口**：schema → service 签名 → repository 方法 → 路由适配；测试随写
- **新增表**：ORM model → Alembic autogenerate → review → 升级；schema 同步更新
- **性能调优**：profiler / asyncpg stats → 定位 N+1 → 加 eager load；无效时评估缓存

## 推荐 ADR 主题

- `ORM 选型`（SQLAlchemy 2.x async / SQLModel / Prisma）
- `异步 vs 同步`（I/O vs CPU bound 的分工）
- `任务队列`（Celery / arq / APScheduler / dramatiq）
- `鉴权方案`（JWT / Session / OAuth2）
- `部署形态`（uvicorn + gunicorn / hypercorn / ASGI on k8s）

## 监控与运维

- OpenTelemetry：`opentelemetry-instrumentation-fastapi` 自动埋点
- 日志：`structlog` 结构化 JSON，通过 `uvicorn --log-config` 统一
- 错误：Sentry `sentry-sdk[fastapi]`
- 指标：`prometheus-fastapi-instrumentator` 暴露 `/metrics`
- Health：`/health` + `/health/ready`（依赖检查：DB/Redis/外部）

## 测试策略

- 单元：pytest + `pytest-asyncio`；service/repository 独立测试
- 集成：`TestClient` / `httpx.AsyncClient` + testcontainers DB
- 覆盖率门槛：service ≥ 85%，api/v1 ≥ 70%
- CI：`ruff` + `mypy --strict` + `pytest --cov`

## 代码骨架示例

### pydantic-settings 配置

```python
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    environment: str = 'development'
    database_url: str
    jwt_secret: str
    cors_origins: list[AnyHttpUrl] = []

settings = Settings()
```

### 依赖注入链

```python
async def get_db() -> AsyncIterator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=['HS256'])
    except JWTError:
        raise HTTPException(status_code=401)
    user = await user_repository.get(db, payload['sub'])
    if not user:
        raise HTTPException(status_code=401)
    return user
```

### Router + service

```python
router = APIRouter(prefix='/users', tags=['users'])

@router.get('/{user_id}', response_model=UserRead)
async def read_user(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
):
    user = await user_service.get(db, user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

### Alembic async env

```python
# migrations/env.py
from sqlalchemy.ext.asyncio import create_async_engine

async def run_async_migrations():
    engine = create_async_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.run_sync(do_run_migrations)
```

## 发布检查清单

- [ ] `uvicorn` + `gunicorn -k uvicorn.workers.UvicornWorker` 部署
- [ ] Alembic 所有迁移已 run
- [ ] CORS origins 白名单收敛
- [ ] JWT / DB 密钥来自 secret manager
- [ ] `/docs` 与 `/redoc` 仅开发开放，或鉴权保护
- [ ] Sentry release + 日志采样率配置
- [ ] Prometheus `/metrics` 仅内网可访问
- [ ] CI: ruff ✓ mypy ✓ pytest --cov ≥ 阈值

## AI 生成规范时的自查清单

生成 FastAPI 项目规范前，Agent 应确认：

1. Pydantic 版本：v2 还是 v1？语法差异极大，规则写法要匹配
2. ORM 痕迹：`sqlalchemy` / `sqlmodel` / `prisma-client-py` / 无？影响 repository 层规则
3. 是否使用 Alembic？`alembic.ini` + `migrations/`。无则需补"迁移管理"规则
4. 鉴权：`python-jose` / `authlib` / `fastapi-users`？
5. 异步还是同步：入口文件里是 `async def` 还是 `def`？混用是隐患，规则要明示"新增端点走 async"
6. 任务队列：`celery` / `arq` / `dramatiq` / `taskiq` / 无？有则追加"异步任务"规范
7. 测试依赖：`pytest-asyncio` + `httpx` 是标准组合；若无，规则要引导补齐
8. 部署形态：容器化（Dockerfile）还是裸机？影响 env/日志/监控规范

## 与其他预设的对照要点

- 与 **NestJS**：DI + DTO + repository 哲学相通；NestJS 的装饰器 = FastAPI 的 `Depends`
- 与 **Express**：FastAPI 更现代、类型驱动；旧 Express 项目若迁移，推荐先引入 TypeScript + NestJS
- 与 **Flask**：FastAPI 是 Flask 思路的现代化（异步 + 类型）；Flask 项目迁移成本中等

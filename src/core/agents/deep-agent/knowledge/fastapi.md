# FastAPI 知识库

## 分层
- `routers/` → `services/` → `repositories/`
- `schemas/` 放 Pydantic 模型；`core/` 配置、依赖注入工厂

## 关键约束
- Router 保持薄，只做参数绑定与响应序列化
- 所有外部输入使用 Pydantic v2 模型校验
- 异步函数内禁止阻塞 IO（使用异步 SDK 或 `run_in_executor`）

## 常见陷阱
- 依赖注入工厂混用单例与请求作用域 → 要显式声明 `scope`
- 文件上传不限制大小 → 中间件里加 `MAX_UPLOAD_SIZE`
- 日志无 request_id → 用 structlog + middleware 补齐

## 性能
- Uvicorn workers 数量 ≈ CPU*2；长连接场景配合 gunicorn
- Response model 使用 `response_model_exclude_none` 减少载荷

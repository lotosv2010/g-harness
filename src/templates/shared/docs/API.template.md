# API 契约定义 — {{project_name}}

> 定义系统对外暴露的所有接口契约。
> 接口变更需先评估向后兼容性，breaking change 需提 ADR。

---

## 1. 概述

### 1.1 基础信息

| 项目 | 值 |
|------|---|
| Base URL | `https://api.example.com/v1` |
| 认证方式 | Bearer Token |
| 数据格式 | JSON |
| 版本策略 | URL 路径版本 (`/v1/`, `/v2/`) |

### 1.2 通用约定

- 时间格式：ISO 8601（`2024-01-01T00:00:00Z`）
- 分页：`?page=1&limit=20`，响应含 `total` 字段
- 错误格式：`{ "error": { "code": "ERR_CODE", "message": "说明" } }`

## 2. 认证

### 2.1 获取 Token

```
POST /auth/login
Body: { "email": "...", "password": "..." }
Response: { "token": "...", "expiresAt": "..." }
```

## 3. API 端点

### 3.1 资源 A

<!-- 按 RESTful 风格逐一定义 -->

```
GET    /resources        — 列表
GET    /resources/:id    — 详情
POST   /resources        — 创建
PUT    /resources/:id    — 更新
DELETE /resources/:id    — 删除
```

## 4. 错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| `AUTH_REQUIRED` | 401 | 未提供有效 Token |
| `FORBIDDEN` | 403 | 无权限访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 422 | 请求参数校验失败 |

## 5. 变更日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| YYYY-MM-DD | v1.0 | 初始版本 |

---

> API 变更需同步更新本文件。Breaking change 需提 ADR + 版本号升级。

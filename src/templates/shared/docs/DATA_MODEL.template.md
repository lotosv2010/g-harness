# 数据模型规格 — {{project_name}}

> 定义核心数据结构、存储方案和模型关系。
> Schema 变更需走 migration 协议。

---

## 1. 数据存储方案

| 存储类型 | 技术选型 | 用途 |
|----------|----------|------|
| 主数据库 | — | 业务数据持久化 |
| 缓存 | — | 热点数据加速 |
| 文件存储 | — | 静态资源 / 上传文件 |

## 2. 核心实体

### 2.1 Entity A

```typescript
interface EntityA {
  id: string           // 主键，UUID
  name: string         // 名称
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

**索引：**
- `id` — 主键
- `status` + `createdAt` — 复合索引（列表查询）

**关系：**
- 1:N → Entity B

### 2.2 Entity B

<!-- 同上格式定义 -->

## 3. ER 关系图

```
┌──────────┐     1:N     ┌──────────┐
│ Entity A │────────────→│ Entity B │
└──────────┘             └──────────┘
```

## 4. 数据约束

- 所有表必须有 `createdAt` / `updatedAt` 时间戳
- 软删除使用 `deletedAt` 字段（不物理删除）
- 外键约束：CASCADE DELETE 需逐一评审

## 5. 迁移记录

| 版本 | 日期 | 描述 |
|------|------|------|
| 001 | YYYY-MM-DD | 初始 Schema |

---

> Schema 变更需走 migration 协议，并更新本文件。

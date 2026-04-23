# AGENTS.md — 通用 AI 开发规范

> 本文件定义所有 AI 编程助手（Claude Code、Cursor、Copilot、Windsurf 等）共同遵守的开发规范。
> 与具体 AI 工具无关，是团队与 AI 协作的基础契约。

---

## 1. 核心原则

### 1.1 先理解，再动手

```
正确流程：读上下文 → 理解架构 → 确认方案 → 编写代码
错误流程：直接开写 → 遇到问题 → 推倒重来
```

AI 在执行任何代码变更前，必须：
1. 读取当前目录及上级目录的上下文文件（CLAUDE.md / AGENTS.md）
2. 读取相关的架构决策记录（docs/decisions/）
3. 识别受影响的模块和依赖关系
4. 确认要遵循的模式和约定

### 1.2 最小变更原则

- 只修改完成任务所需的最少文件
- 不做"顺便"的重构，除非明确要求
- 不引入当前不需要的依赖
- 不改变现有代码的行为，除非这就是目标

### 1.3 可验证性原则

- 每个变更必须可测试
- 每个决策必须可追溯（说明原因）
- 每个新增模式必须有示例

---

## 2. 代码标准

### 2.1 语言与风格

```yaml
language: TypeScript（严格模式）
style:
  - 使用函数式组件，禁止 class 组件
  - 使用 const 优于 let，禁止 var
  - 使用命名导出优于默认导出
  - 使用 interface 优于 type（除非需要联合类型）
  - 错误处理使用 Result 模式，减少 try-catch 滥用
```

### 2.2 命名约定

| 对象 | 规则 | 示例 |
|------|------|------|
| 文件 - 组件 | PascalCase | `UserProfile.tsx` |
| 文件 - Hook | camelCase + use 前缀 | `useAuth.ts` |
| 文件 - 工具函数 | camelCase | `formatDate.ts` |
| 文件 - 常量 | SCREAMING_SNAKE | `API_ENDPOINTS.ts` |
| 文件 - 类型 | PascalCase | `UserTypes.ts` |
| 文件 - 测试 | `{name}.test.{ext}` | `UserProfile.test.tsx` |
| 目录 - 功能模块 | kebab-case | `user-profile/` |
| 目录 - 组件 | PascalCase | `UserProfile/` |
| 代码 - 组件 | PascalCase | `function UserProfile()` |
| 代码 - Hook | useCamelCase | `function useAuth()` |
| 代码 - 处理函数 | handle + 动作 | `handleSubmit` |
| 代码 - 布尔值 | is/has/should | `isLoading` |
| 代码 - 常量 | SCREAMING_SNAKE | `MAX_RETRY_COUNT` |
| 代码 - 枚举 | PascalCase.UPPER | `Status.ACTIVE` |

### 2.3 文件组织

每个功能模块的标准结构：

```
features/[feature-name]/
├── components/           # 功能专属组件
├── hooks/                # 功能专属 Hook
├── services/             # 功能专属 API 调用
├── stores/               # 功能专属状态
├── types/                # 功能专属类型
├── utils/                # 功能专属工具
├── __tests__/            # 功能测试
└── index.ts              # 公共 API（桶文件）
```

---

## 3. 架构约束

### 3.1 模块边界

```
严禁：features/A → features/B（跨功能模块直接导入）
允许：features/A → shared/*（通过共享层通信）
允许：features/A → api/*（通过 API 层获取数据）
允许：features/A → core/*（使用核心工具）
```

### 3.2 层级依赖规则

```
core     ← 不依赖任何业务层
shared   ← 只依赖 core
api      ← 只依赖 core、shared
features ← 可依赖 core、shared、api
app      ← 可依赖所有层
```

### 3.3 HTTP 请求集中管理

所有 HTTP 请求必须通过 `packages/*/api/` 或 `packages/server/` 层发起，禁止在组件或 Hook 中直接调用 `fetch` / `axios`。

---

## 4. 测试标准

### 4.1 测试策略

| 类型 | 覆盖目标 | 工具 |
|------|----------|------|
| 单元测试 | 工具函数、Hook、Store | Vitest |
| 组件测试 | 交互逻辑、渲染行为 | Testing Library |
| 集成测试 | API 层、跨模块交互 | Vitest + MSW |
| E2E 测试 | 核心用户流程 | Playwright |

### 4.2 测试原则

- 业务逻辑必须有单元测试
- 新增组件必须有基础渲染测试
- 修复 Bug 必须附带回归测试
- 测试应验证行为，而非实现细节

---

## 5. Git 规范

### 5.1 提交消息

格式：`<type>(<scope>): <description>`

```
feat(auth):     添加微信扫码登录
fix(payment):   修复重复扣款问题
refactor(user): 将用户模块迁移至功能模块结构
docs(api):      更新支付接口文档
test(cart):     补充购物车边界条件测试
chore(deps):    升级 React 至 19.x
```

### 5.2 分支策略

```
main          ← 生产环境，受保护
develop       ← 开发主线
feat/*        ← 功能分支
fix/*         ← 修复分支
refactor/*    ← 重构分支
```

---

## 6. AI 协作安全规则

### 6.1 禁止事项

- **禁止**提交 `.env` 文件或任何包含密钥的文件
- **禁止**在代码中硬编码密钥、Token、密码
- **禁止**未经确认执行破坏性操作（删除文件、重置分支、修改数据库结构）
- **禁止**修改 CI/CD 配置而不说明原因
- **禁止**绕过 pre-commit 钩子（`--no-verify`）

### 6.2 需确认事项

以下操作必须先向用户确认：
- 删除文件或目录
- 修改数据库 Schema
- 升级核心依赖版本
- 修改构建或部署配置
- 向第三方服务发送数据

---

## 7. 文档维护

### 7.1 代码注释

- 注释语言与代码库现有注释保持一致
- 只注释"为什么"，不注释"是什么"
- 公共 API 必须有 JSDoc 类型标注
- 复杂算法必须有简要说明

### 7.2 架构文档同步

当代码变更涉及以下内容时，必须同步更新对应文档：
- 新增模块 → 更新 `docs/ARCHITECTURE.md`
- API 变更 → 更新 `docs/API_SPEC.md`
- 数据模型变更 → 更新 `docs/DATA_MODEL.md`
- 架构决策 → 新增 `docs/decisions/` ADR

---

## 8. 适用范围

本文件规范适用于：
- 所有 AI 编程助手（Claude Code、Cursor、Copilot 等）
- 所有人类开发者
- 所有代码审查流程

具体 AI 工具的专属配置见各自配置文件（如 `CLAUDE.md`）。

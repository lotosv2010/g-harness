# AGENTS.md — 通用 AI 开发规范

> 本文件定义所有 AI 编程助手（Claude Code、Cursor、Copilot、Windsurf 等）共同遵守的开发规范。
> 与具体 AI 工具无关，是团队与 AI 协作的基础契约。
> 
> 注意：本文件为开发 g-forge 项目本身的规范。
> 目标项目的通用规范模板见 `src/templates/AGENTS.template.md`。

---

## 1. 核心原则

### 1.1 先理解，再动手

```
正确流程：读上下文 → 理解架构 → 确认方案 → 编写代码
错误流程：直接开写 → 遇到问题 → 推倒重来
```

AI 在执行任何代码变更前，必须：
1. 读取 `CLAUDE.md` 和本文件
2. 读取相关的 `docs/decisions/` ADR
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

- 语言：TypeScript 严格模式
- 使用 `const` 优于 `let`，禁止 `var`
- 使用命名导出优于默认导出
- 使用 `interface` 优于 `type`（除非需要联合类型）
- 错误处理使用 Result 模式，减少 try-catch 滥用

### 2.2 命名约定

| 对象 | 规则 | 示例 |
|------|------|------|
| 文件 - 模块 | kebab-case | `file-generator.ts` |
| 文件 - 类型 | kebab-case | `scan-result.ts` |
| 文件 - 测试 | `{name}.test.{ext}` | `file-generator.test.ts` |
| 目录 | kebab-case | `core/scanner/` |
| 代码 - 类/接口 | PascalCase | `FileGenerator` |
| 代码 - 函数 | camelCase | `resolveVariables` |
| 代码 - 常量 | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| 代码 - 布尔值 | is/has/should | `isMonorepo` |

### 2.3 文件组织

g-forge 项目的目录职责：

| 目录 | 职责 | 允许的内容 |
|------|------|-----------|
| `src/` | 全部业务代码 | CLI 源码 + content + presets + templates |
| `src/content/` | 通用规范 | Markdown 规范文件（技术栈无关） |
| `src/presets/` | 技术栈预设 | preset.json + 栈特定规范 |
| `src/templates/` | 文件模板 | `*.template.md` 模板 |
| `.claude/` | Claude Code 配置 | 开发 g-forge 自身的规则/协议 |
| `tools/` | 工具层 | Prompt 模板 + 自动化脚本 |

---

## 3. 架构约束

### 3.1 目录职责分离

```
src/cli        ← CLI 命令入口
src/core       ← 核心逻辑模块
src/content    ← 只放通用规范，不放代码和技术栈特定内容
src/presets    ← 只放技术栈特定内容，不依赖其他预设
src/templates  ← 只放文件模板
```

### 3.2 src/content/ 技术栈无关

src/content/ 中的文件禁止引用特定框架或工具，使用 `{{variable}}` 占位符。

### 3.3 模块依赖方向

```
src/utils      ← 不依赖任何其他 src/ 模块
src/core/*     ← 可依赖 utils
src/cli        ← 可依赖 core、utils
```

---

## 4. 测试标准

| 类型 | 覆盖目标 | 工具 |
|------|----------|------|
| 单元测试 | scanner、generator、validator、migrator | Vitest |
| 集成测试 | CLI 端到端命令 | Vitest |
| 夹具测试 | 模拟项目结构校验 | tests/fixtures/ |

- 业务逻辑必须有单元测试
- 修复 Bug 必须附带回归测试
- 测试应验证行为，而非实现细节

---

## 5. Git 规范

### 5.1 提交消息

格式：`<type>(<scope>): <description>`

```
feat(cli):       添加 init 命令
fix(validator):  修复规则匹配逻辑
refactor(core):  重构模板渲染引擎
docs(arch):      更新架构文档
test(scanner):   补充扫描器边界测试
chore(deps):     升级 vitest 至最新版
```

### 5.2 分支策略

```
main          ← 稳定版本，受保护
develop       ← 开发主线
feat/*        ← 功能分支
fix/*         ← 修复分支
```

---

## 6. AI 协作安全规则

- **禁止**提交 `.env` 文件或任何包含密钥的文件
- **禁止**在代码中硬编码密钥、Token、密码
- **禁止**未经确认执行破坏性操作
- **禁止**绕过 pre-commit 钩子
- 删除文件、修改配置、升级依赖等操作必须先确认

---

## 7. 文档维护

- 注释语言：中文
- 只注释"为什么"，不注释"是什么"
- 代码变更涉及架构时，必须同步更新 `docs/ARCHITECTURE.md`
- 新增 API → 更新 `docs/API.md`
- 架构决策 → 新增 `docs/decisions/` ADR

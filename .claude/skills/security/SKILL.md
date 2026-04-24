---
name: security
description: 安全审计 — 扫描依赖漏洞、敏感信息泄露、代码安全问题，输出分级报告和修复建议。
triggers:
  - 安全检查
  - 安全审计
  - 漏洞扫描
  - 敏感信息
invocable: true
arguments:
  - name: scope
    hint: "[deps|secrets|code|all]"
    required: false
capabilities:
  - read
  - search
  - execute
extensions:
  claude:
    allowed-tools: "Read Glob Grep Bash(pnpm audit *) Bash(npm audit *) Bash(git log *) Bash(wc *)"
    context: fork
---

# 安全审计（security）

全方位安全扫描，覆盖依赖、敏感信息、代码三个维度。

## 用法

```
/security              # 全量审计（deps + secrets + code）
/security deps         # 仅依赖漏洞扫描
/security secrets      # 仅敏感信息扫描
/security code         # 仅代码安全审查
```

## 审计维度

### 1. 依赖漏洞扫描（deps）

**步骤：**
1. 运行 `pnpm audit --json`（或 `npm audit --json`）
2. 解析漏洞列表，按严重度分级
3. 检查 `package.json` 中是否有已废弃的包
4. 检查是否有来源不明的包（非 npmjs.com 官方源）

**输出格式：**
```
🔴 Critical: N 个
🟠 High: N 个
🟡 Moderate: N 个
🔵 Low: N 个
```

### 2. 敏感信息扫描（secrets）

**扫描范围：**
- 源码文件中的硬编码密钥（API key、Token、密码、私钥）
- `.env*` 文件是否被 `.gitignore` 排除
- git 历史中是否有敏感信息提交（最近 50 个 commit）
- 日志输出中是否包含敏感字段

**检测模式：**
```
/[A-Za-z0-9+/]{40,}/     — Base64 长字符串
/sk-[a-zA-Z0-9]{32,}/     — OpenAI API Key
/ghp_[a-zA-Z0-9]{36}/     — GitHub Token
/AKIA[0-9A-Z]{16}/        — AWS Access Key
/password\s*[=:]\s*['"]/  — 硬编码密码
/-----BEGIN.*KEY-----/     — 私钥文件
```

### 3. 代码安全审查（code）

**检查项：**
- SQL 拼接（SQL 注入风险）
- `eval()` / `Function()` 使用
- 未转义的用户输入渲染（XSS 风险）
- 不安全的正则（ReDoS 风险）
- 不安全的反序列化
- 路径遍历风险（`../` 未过滤）
- CORS 配置过于宽松（`Access-Control-Allow-Origin: *`）

## 输出格式

```markdown
## 安全审计报告

**扫描时间**：YYYY-MM-DD HH:mm
**扫描范围**：[deps|secrets|code|all]

### 风险摘要

| 严重度 | 数量 | 维度 |
|--------|------|------|
| 🔴 Critical | N | deps/secrets/code |
| 🟠 High | N | ... |
| 🟡 Moderate | N | ... |

### 详细发现

#### [严重度] [维度] 问题标题
- **位置**：file:line
- **风险**：描述
- **修复建议**：具体修复方式

### 改进建议（按优先级排序）
1. ...
```

## 约束

- 不修改任何代码，仅输出报告
- 不执行具有破坏性的命令
- 发现 Critical 级别问题时，在报告开头醒目标注

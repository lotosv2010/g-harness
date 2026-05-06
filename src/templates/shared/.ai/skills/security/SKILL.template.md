---
name: security
description: 安全审计 — 扫描依赖漏洞、敏感信息泄露、代码安全问题，输出分级报告和修复建议。
triggers:
  - 安全扫描
  - 安全审计
  - 漏洞检查
  - 密钥扫描
invocable: true
arguments: []
capabilities:
  - read
  - search
  - execute
---

# 安全审计（security）

全方位安全扫描，输出分级报告。

## 用法

```
/security
```

## 扫描维度

### 1. 敏感信息泄露
- 硬编码 API Key / Secret / Token
- 私钥文件
- `.env` 文件是否被 gitignore

### 2. 依赖漏洞
- 运行 `npm audit` / `pnpm audit`
- 检查已知 CVE
- 高危依赖标注

### 3. 代码安全
- SQL 注入风险（拼接查询）
- XSS 风险（未转义输出）
- 路径遍历（用户输入拼路径）
- 不安全的 `eval` / `Function`

### 4. 配置安全
- CORS 配置是否过于宽松
- HTTPS 是否强制
- 认证 / 授权检查

## 输出格式

```
# 安全审计报告

## 🔴 高危 (N)
- ...

## 🟠 中危 (N)
- ...

## 🟡 低危 (N)
- ...

## 修复建议
1. [高危优先] ...
```

## 约束

- 只读扫描，不修改文件
- 发现高危问题立即警告
- 不输出实际的密钥/Token 内容

# 敏感信息泄露扫描守卫（g-harness 项目自身）

> 防止密钥、Token 等进入 g-harness 代码仓库。
> 目标项目的扫描规则见 `src/templates/shared/.ai/guardrails/secret-scan.template.md`。

---

## 扫描规则

### 高危模式（阻塞提交）

- 硬编码 API Key / Secret / Token 赋值
- 私钥文件内容（PEM / RSA / EC）
- 已知平台 Token 格式（GitHub ghp_、OpenAI sk-、AWS AKIA）

### 文件黑名单

- `.env` / `.env.*`
- `*.key` / `*.pem`
- `credentials.*`

## g-harness 特殊注意

- `src/core/agents/deep-agent/` 处理用户 API Key 时必须通过参数传入，禁止硬编码
- 测试中如需模拟 API Key，使用明显的假值：`sk-test-fake-key-for-unit-test`
- `.env.example` 中只放 key 名称，不放真实值

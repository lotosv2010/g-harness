# 敏感信息泄露扫描守卫 — {{project_name}}

> 防止密钥、Token、密码等敏感信息进入代码仓库。

---

## 扫描规则

### 高危模式（阻塞提交）

| 模式 | 说明 |
|------|------|
| `(api[_-]?key\|secret\|password\|token)\s*[:=]\s*["'][^\s]+` | 硬编码凭证赋值 |
| `-----BEGIN (RSA\|EC\|DSA)? ?PRIVATE KEY-----` | 私钥文件内容 |
| `ghp_[A-Za-z0-9]{36}` | GitHub Personal Access Token |
| `sk-[A-Za-z0-9]{48}` | OpenAI API Key |
| `AKIA[0-9A-Z]{16}` | AWS Access Key ID |

### 文件黑名单（禁止提交）

- `.env` / `.env.*`（除 `.env.example`）
- `*.key` / `*.pem` / `*.p12`
- `credentials.*` / `serviceAccountKey.*`
- `id_rsa` / `id_ed25519`

## 处理流程

1. **检测到匹配：** 阻塞提交，显示文件路径和行号
2. **误报处理：** 在行尾添加 `# nosec` 注释标记为安全（需 review 确认）
3. **历史泄露：** 使用 `git filter-branch` 或 BFG Repo-Cleaner 清除历史
4. **已泄露凭证：** 立即轮换（revoke + regenerate）

## 集成方式

```bash
# pre-commit hook 中执行
git diff --cached --diff-filter=ACMR | grep -nE \
  '(api[_-]?key|secret|password|token)\s*[:=]\s*["'"'"'][^\s]+' && \
  echo "ERROR: 检测到疑似敏感信息" && exit 1
```

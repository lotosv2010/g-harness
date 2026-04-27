# 功能开发协议 — {{project_name}}

> 新增功能时必须遵循的执行协议。

---

## 1. 理解

- 阅读 `docs/SPEC.md` 中该功能的验收标准
- 查看 `AGENTS.md` 与所选 AI 助手入口文件
- 检查 `docs/ARCHITECTURE.md` 中相关模块的分层约束

## 2. 规划

- 列出将新增 / 修改 / 删除的文件清单
- 标注涉及的模块与跨模块依赖
- 识别风险点：是否改接口？是否破坏现有测试？

## 3. 实施

- 先改类型与契约，再改实现
- 按模块边界提交，避免一次改动跨多个模块
- 保持改动最小化，拒绝顺带重构

## 4. 验证

{{test_standards}}

- 相关命令：
{{commands}}

## 5. 提交

- commit message 遵循 Conventional Commits（feat / fix / refactor / docs / chore / test）
- 提交前不要求用户跑 commit；交由用户决定
- PR 描述必须包含：动机、方案、验证步骤

# 部署后钩子（g-harness 项目自身）

> 触发时机：npm publish 完成后。

---

## 自动执行项

1. **验证发布**
   - `npm info g-harness version` 返回新版本号
   - `npx g-harness@latest --version` 运行正常

2. **更新记录**
   - 更新 `docs/tasks/CURRENT.md`（标注发布版本和日期）
   - 如有 GitHub Release，确认已创建

3. **通知**
   - 输出发布摘要
   - 提醒同步更新相关文档（README badge 等）

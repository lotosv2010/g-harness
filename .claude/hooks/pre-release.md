# 发布前钩子（g-harness 项目自身）

> 触发时机：npm publish 前自动检查。

---

## 检查项

1. 在 main 分支且 `git status` 干净
2. `pnpm typecheck && pnpm test && pnpm lint` 全部通过
3. `pnpm build` 构建成功
4. `dist/index.js` 存在且可执行（`node dist/index.js --version`）
5. 版本号已更新（`package.json` version != npm latest）
6. 无 TODO 标注为 "release blocker"

## 自动执行

- 从 commit 历史生成 Changelog 草稿
- 建议版本号（feat → minor / fix → patch）
- 列出自上次 tag 以来的 breaking changes

## 输出

```
发布检查：
  分支：main ✓
  测试：通过 ✓
  构建：成功 ✓
  版本：x.y.z → x.y.z+1
```

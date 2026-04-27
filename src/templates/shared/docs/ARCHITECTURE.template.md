# 架构白皮书 — {{project_name}}

> 描述 What / Why / How 的系统视图。
> 重大变更需先提 ADR，再更新本文件。

---

## 1. 上下文

{{project_description}}

## 2. 技术栈

{{tech_stack}}

## 3. 架构总览

{{architecture_overview}}

## 4. 模块划分

{{module_breakdown}}

## 5. 目录结构

```
{{project_structure}}
```

## 6. 跨模块契约

- 模块间通信统一通过显式导出的类型与函数
- 严禁跨模块直接引用内部实现
- 持久化与外部 I/O 封装在基础设施层

## 7. 关键决策索引

见 `docs/decisions/` 目录：
- ADR-001 架构基线
- 后续新增决策按序号递增

## 8. 演进路径

- v0：核心功能闭环
- v1：稳定性 + 可观测性
- v2：性能 + 规模化

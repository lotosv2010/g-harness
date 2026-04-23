# 预设创建模板

> 新建预设时复制本目录并按以下结构填充。

---

## 预设目录结构

```
presets/<preset-name>/
├── preset.json              # 预设元数据（名称、描述、技术栈、变量值）
├── CLAUDE.template.md       # 覆盖基础 CLAUDE.md 模板的栈特定内容
├── rules/                   # 栈特定规则（补充 core/rules/）
│   └── *.md
└── skills/                  # 栈特定技能
    └── *.md
```

## preset.json 格式

```json
{
  "name": "preset-name",
  "description": "预设描述",
  "techStack": {
    "language": "TypeScript",
    "runtime": "Node.js 20+",
    "framework": "React 19",
    "buildTool": "Vite 6",
    "testRunner": "Vitest",
    "packageManager": "pnpm"
  },
  "variables": {
    "shared_dir": "src/shared",
    "feature_dir": "src/features",
    "api_dir": "src/api",
    "routes_dir": "src/routes",
    "services_dir": "src/services",
    "core_dir": "src/core",
    "app_dir": "src"
  }
}
```

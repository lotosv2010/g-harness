---
id: ADR-008
status: accepted
date: 2026-04-24
superseded_by: null
---

# 项目索引作为 AI 上下文优先入口

## 背景

G-Forge 的目标是让 AI 在规范约束下持续输出高质量代码。v1.2 之前的痛点：

1. **AI 改动前广度扫描浪费 token**：AI 接到"修复路由 X 的 Bug"后，往往用 Glob/Grep 遍历整个仓库寻找定义，动辄消耗数千 token。
2. **上下文切换无锚点**：CLAUDE.md 只描述了项目结构，没有"某功能入口在哪个文件"的直接索引。
3. **协议未硬化读索引约定**：feature / bugfix 协议没有强制 AI 先读索引再定位代码，导致 AI 行为依赖模型的先验知识。
4. **漂移无感知**：即使生成了索引文件，源码变动后索引很快过期，AI 仍读到陈旧信息。

期望：为每个接入 G-Forge 的项目生成一套 AI 必读的索引文件，让 AI 改动前先读索引，并通过协议硬化 + 漂移检测保持索引实时性。

## 决策

采用 **`gforge index` 命令生成三件套索引文件**，并通过协议、watch 模式、drift 检测形成闭环。

### 三件套索引文件

| 文件 | 内容 | 更新频率 |
|------|------|----------|
| `docs/PROJECT_MAP.md` | 模块清单（模块名 → 文件路径 + 公共 exports） | 源码结构变化时 |
| `docs/FEATURES.md` | 功能清单（功能名 → 入口文件） | 功能新增/移除时 |
| `docs/ROUTES.md` | 路由表（HTTP method + path → handler 文件） | 路由定义变化时 |

### 核心命令

- `gforge index` — 全量重建三个索引文件
- `gforge index --watch` — 监听 `src/` 递归变化，500ms 防抖增量更新；内容未变化时跳过写入避免下游 watcher 级联
- `gforge index --check` — 漂移检测：对比索引 vs 实际代码，识别 `added` / `removed` / `dangling` 三类漂移，发现时 exit 1（CI 友好）

### 协议硬化

- CLAUDE.md 上下文优先列表中 `PROJECT_MAP.md` 排在第 2 位（仅次于 CLAUDE.md）
- feature / bugfix 协议阶段 1 显式要求"必须先读索引再定位代码，禁止未读索引就整库扫描"
- test-gen / scaffold skill 执行步骤中新增"读索引"前置步骤 + "刷新索引"后置步骤

### 路由识别支持

实现 `src/core/indexer/route-parser.ts`，支持：

- Next.js App Router（`app/**/page.tsx`、`app/**/route.ts`）
- Next.js Pages Router（`pages/**/*.tsx`、`pages/api/**/*.ts`）
- Nuxt（`pages/**/*.vue`、`server/api/**/*.ts`）
- Express / Hono / Fastify（`app.get/post/put/...` 调用图）
- React Router（`createBrowserRouter` + `<Route />` 声明）
- Vue Router（`createRouter` + `routes` 数组）

## 备选方案

### 方案 A：AI 自行扫描（v1.2 前的状态）

每次改动时让 AI 用 Glob/Grep 扫描 src/ 找定位。

- 优点：零额外产出
- 缺点：每次对话重复消耗数千 token；AI 易漏关键入口；大仓库扫描上下文窗口爆炸

### 方案 B：将索引内容塞进 CLAUDE.md

在 CLAUDE.md 中嵌入模块 / 路由清单。

- 优点：AI 启动即加载
- 缺点：CLAUDE.md 膨胀难读；不支持 --watch 增量更新；与 CLAUDE.md 的"配置"语义冲突

### 方案 C：JSON 索引文件（机读优先）

用 `gforge-index.json` 存索引。

- 优点：程序友好
- 缺点：AI 阅读成本更高；非 Claude 系 agent 对 JSON 友好度参差；Markdown 表格 AI 解析更稳

## 采用：方案 A（本 ADR 决策）

**Markdown 三件套 + 协议硬化 + watch/check 双命令**。

## 影响

### 正面
- AI 改动前读一次索引即可定位代码，token 消耗可下降 30~60%（实测 g-forge 自身仓库）
- `--check` 模式在 CI 中强制索引与代码同步，避免陈旧文档
- 三件套按语义拆分（模块 / 功能 / 路由），AI 可按需读取而非一次性加载所有索引
- 索引文件是 Markdown 表格，对 Claude / Cursor / Kimi 等主流 agent 都友好

### 负面 / 权衡
- 新增 `src/core/indexer/` 模块（~600 行代码 + 6 个单测）
- `--watch` 对超大仓库（10k+ 文件）可能有 fs.watch 性能瓶颈 —— 500ms 防抖 + content-diff 已缓解
- 路由解析是启发式的，对自定义路由库（如 ts-rest）支持有限，需按需扩展 parser

## AI 指引

- 实现集中在 `src/core/indexer/`（route-parser / module-extractor / feature-mapper / index-writer / index-drift）
- 输出文件路径固定为 `docs/PROJECT_MAP.md` / `docs/FEATURES.md` / `docs/ROUTES.md`
- Markdown 表格格式必须与 `index-drift.ts` 的 parser 兼容（`parseModuleTable` / `parseFeatureTable` / `parseRouteTable`）
- watch 模式使用 `fs.watch(root, { recursive: true })` + 500ms debounce
- drift 检测逻辑：解析现有索引 → 扫描最新代码 → 取差集 → 分类为 added / removed / dangling
- 新增路由框架支持时，扩展 `route-parser.ts` 的识别函数即可，遵循"返回 RouteEntry[] | null"约定

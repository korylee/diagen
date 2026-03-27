# Diagen AI 知识库

目的：
- 提供与当前代码一致的最小必要上下文。
- 默认优先回答三个问题：仓库怎么分层、当前做到哪、下一步做什么。

建议阅读顺序：
1. `AI_KB/PROJECT_OVERVIEW.md`
2. `AI_KB/REPO_MAP.md`
3. `AI_KB/ARCHITECTURE.md`
4. `AI_KB/ROADMAP.md`
5. `AI_KB/DEV_GUIDE.md`

按需阅读：
- 模型与持久化：`DOMAIN_MODEL.md`
- 外部接线点：`INTEGRATION_POINTS.md`
- ProcessOn 对照：`PROCESS_ON_COMPARISON.md`
- draw.io / mxGraph 对照：`DRAWIO_MXGRAPH_COMPARISON.md`
- 快捷建线设计记录：`SHAPE_LINKER_QUICK_CREATE_DESIGN.md`

当前要点（2026-03-27）：
- `core` 已具备 `tool / history / clipboard / edit / view` 等核心 manager。
- `renderer` 已接入 shape / linker 正式创建链路，`LinkCreateOverlay` 可直接发起快捷建线。
- `renderer` 已有首批 `RendererContainer` 容器级回归：`box select / drag / resize / rotate / zoom / scroll`。
- `edit manager` 已修复整对象字段更新的历史快照问题，`rotate + history.transaction` 回退已恢复。
- 当前最近一轮开发应先补 `clipboard` 键盘/toolbar 入口闭环，再补 `create-linker / LinkCreateOverlay / auto-scroll` 的容器级回归。
- 再下一阶段再进入连续编辑串联验证与 move/resize guide line。

维护规则：
- 包结构变化：更新 `REPO_MAP.md`
- 当前能力或优先级变化：更新 `PROJECT_OVERVIEW.md`、`ROADMAP.md`
- 坐标、交互、渲染链变化：更新 `ARCHITECTURE.md`
- 调试与测试入口变化：更新 `DEV_GUIDE.md`

最后更新：2026-03-27

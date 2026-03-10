# Diagen AI 知识库

目的：
- 为 AI/自动化开发提供稳定、可检索、与当前代码一致的上下文。
- 重点覆盖：坐标系统、交互链路、状态边界、ProcessOn 与 draw.io/mxGraph 的可迁移经验。

建议阅读顺序：
1. `AI_KB/PROJECT_OVERVIEW.md`
2. `AI_KB/REPO_MAP.md`
3. `AI_KB/ARCHITECTURE.md`
4. `AI_KB/DOMAIN_MODEL.md`
5. `AI_KB/INTEGRATION_POINTS.md`
6. `AI_KB/PROCESS_ON_COMPARISON.md`
7. `AI_KB/DRAWIO_MXGRAPH_COMPARISON.md`
8. `AI_KB/DEV_GUIDE.md`

当前版本要点（2026-03-11）：
- 坐标转换修复：`screenToCanvas(Bounds)` 的 `w/h` 已改为除以 `zoom`。
- 事件坐标入口统一：renderer 侧使用 `eventToCanvasPoint`。
- 容器层级重构为三层：`world-layer` / `scene-layer` / `overlay-layer`。
- `Interaction` 不再暴露 viewport DOM，改为暴露能力函数 `eventToCanvas`。

更新规则：
- 新增/调整包结构：更新 `REPO_MAP.md`、`PROJECT_OVERVIEW.md`
- 修改坐标、交互、渲染链路：更新 `ARCHITECTURE.md`、`INTEGRATION_POINTS.md`
- 修改模型字段或持久化格式：更新 `DOMAIN_MODEL.md`
- 对标参考框架结论变化：更新 `PROCESS_ON_COMPARISON.md`、`DRAWIO_MXGRAPH_COMPARISON.md`
- 命令或调试流程变化：更新 `DEV_GUIDE.md`

最后更新日期：2026-03-11

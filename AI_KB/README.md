# Diagen AI 知识库

目的：
- 为 AI/自动化开发提供稳定、可检索、与当前代码一致的上下文。
- 重点覆盖：坐标系统、交互链路、状态边界、`.processon` 深度对照、draw.io/mxGraph 参考与近期交付计划。

建议阅读顺序：
1. `AI_KB/PROJECT_OVERVIEW.md`
2. `AI_KB/REPO_MAP.md`
3. `AI_KB/ARCHITECTURE.md`
4. `AI_KB/DOMAIN_MODEL.md`
5. `AI_KB/INTEGRATION_POINTS.md`
6. `AI_KB/PROCESS_ON_COMPARISON.md`
7. `AI_KB/DRAWIO_MXGRAPH_COMPARISON.md`
8. `AI_KB/ROADMAP_2W_2026-03-13.md`
9. `AI_KB/EXECUTION_READINESS_2026-03-16.md`
10. `AI_KB/DEV_GUIDE.md`

当前版本要点（2026-03-16）：
- 事件坐标归一化入口已迁移到 `createCoordinateService`：`packages/renderer/src/primitives/createCoordinateService.ts`。
- 渲染容器采用三层契约：`world-layer` / `scene-layer` / `overlay-layer`。
- `.processon` 深度对照已补充吸附线、剪贴板、历史与扩容机制的源码级分析。
- 已新增未来 1-2 周详尽开发计划，后续阶段仅保留滚动简版路线。
- 已新增执行前就绪审查文档（阻塞项、PR 切分、开工门槛）。

更新规则：
- 新增/调整包结构：更新 `REPO_MAP.md`、`PROJECT_OVERVIEW.md`
- 修改坐标、交互、渲染链路：更新 `ARCHITECTURE.md`、`INTEGRATION_POINTS.md`
- 修改模型字段或持久化格式：更新 `DOMAIN_MODEL.md`
- 对标参考框架结论变化：更新 `PROCESS_ON_COMPARISON.md`、`DRAWIO_MXGRAPH_COMPARISON.md`
- 计划与节奏变化：更新 `ROADMAP_2W_2026-03-13.md`
- 执行前准备与阻塞项变化：更新 `EXECUTION_READINESS_2026-03-16.md`
- 命令或调试流程变化：更新 `DEV_GUIDE.md`

最后更新日期：2026-03-16

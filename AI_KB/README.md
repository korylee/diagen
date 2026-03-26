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
8. `AI_KB/SHAPE_LINKER_QUICK_CREATE_DESIGN.md`
9. `AI_KB/ROADMAP.md`
10. `AI_KB/DEV_GUIDE.md`

当前版本要点（2026-03-26）：
- 事件坐标归一化入口已迁移到 `createCoordinateService`：`packages/renderer/src/primitives/createCoordinateService.ts`。
- 渲染容器采用三层契约：`world-layer` / `scene-layer` / `overlay-layer`。
- 工具态基础设施已落地：`core` 新增 `tool manager`，运行时支持 `idle / create-shape / create-linker`。
- shape / linker 正式创建链路已接入 renderer 主链路：工具态下可直接点击画布或点按 shape 创建。
- 连线路由主链路已接入 `view` 配置：默认 `broken/orthogonal` 走 obstacle + hybrid，`straight/curved` 保持 basic。
- `lineJumps` 已接入主渲染链：`diagram.page.lineJumps` 可驱动 `LinkerCanvas` 跳线绘制。
- 连线端点候选选择已调整为“固定锚点优先、perimeter 回退”，提升创建/重连时的连接稳定性。
- `packages/components` 当前已沉淀 `panel`、`actionBar`、`menu` 三类基础构件。
- `packages/ui` 负责将 `Designer` 状态/命令桥接到侧边栏与工具栏等壳层能力，宿主层尽量只保留布局与少量插槽。
- 已新增 `packages/icons` 纯图标资产包，当前采用 `assets + svgo + src/generated` 生成流程。
- `packages/ui/sidebar` 已负责搜索过滤、搜索结果 section 与分类生成，避免把设计器语义继续抬进基础构件层。
- `packages/ui/Sidebar` 已直接组合 `@diagen/components/panel`，`packages/ui/Toolbar` 已直接组合 `@diagen/components/actionBar`。
- playground 已将顶部工具栏与左侧 Sidebar 的 `Designer` 接线下沉到 `packages/ui`，宿主层仅保留数据加载、布局和少量状态插槽。
- `.processon` 深度对照已补充吸附线、剪贴板、历史与扩容机制的源码级分析。
- 近期执行信息已统一收敛到 `ROADMAP.md`，不再拆分多份计划/审查文档。
- 已新增 shape 右上角快捷建线设计，明确 UI、锚点决策、事务边界与复用策略。
- “从锚点拖出创建新线”专项计划已并入 `ROADMAP.md` 的 D4 专项章节。
- 后续最高优先级已调整为“补齐编辑器核心能力”，主线依次为：创建与连线、选择与导航、撤销重做与剪贴板、命令入口与最小壳层闭环。
- 当前最关键的 P0 缺口为：快捷建线事务闭环、clipboard manager、renderer 交互回归测试。

更新规则：
- 新增/调整包结构：更新 `REPO_MAP.md`、`PROJECT_OVERVIEW.md`
- 修改坐标、交互、渲染链路：更新 `ARCHITECTURE.md`、`INTEGRATION_POINTS.md`
- 修改模型字段或持久化格式：更新 `DOMAIN_MODEL.md`
- 对标参考框架结论变化：更新 `PROCESS_ON_COMPARISON.md`、`DRAWIO_MXGRAPH_COMPARISON.md`
- shape 快捷建线方案变化：更新 `SHAPE_LINKER_QUICK_CREATE_DESIGN.md`
- 锚点拖出建线实施计划变化：更新 `ROADMAP.md` 的 D4 专项章节
- 计划与节奏变化：更新 `ROADMAP.md`
- 命令或调试流程变化：更新 `DEV_GUIDE.md`

最后更新日期：2026-03-26

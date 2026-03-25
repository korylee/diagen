# Diagen 近期开发计划（1-2 周，基于 `.processon` 与 draw.io 对照）

日期：2026-03-24  
计划周期：10 个工作日（可在 1-2 周内按人力压缩或拉伸）  
计划目标：在不破坏现有分层（`core/renderer/primitives/ui`）的前提下，优先补齐编辑器生产力缺口，并开始建设应用壳层 UI。

---

## 当前进度摘要（2026-03-24）

已完成：
1. `tool manager` 已接入 `core`，并具备 `idle / create-shape / create-linker` 运行时语义。
2. shape / linker 正式创建链路已进入 renderer 主链路：
   - `RendererContainer.tsx` 已支持 `create-shape` 点击落点创建
   - `RendererContainer.tsx` 已支持 `create-linker` 从空白点开始创建
   - `CanvasRenderer.tsx` 已支持 `create-linker` 下点按 shape 直接进入快速建线
3. `packages/ui` 已完成第一阶段壳层能力，`Sidebar` 与 `Toolbar` 已可用于 playground 最小集成。
4. `packages/designer-ui` 已建立 bridge 层，包含 `createToolbarBridge`、`createShapeLibraryBridge`、`createSidebarActionBridge` 与 `Sidebar / Toolbar`。
5. `packages/icons` 已形成“平铺 assets + svgo 规范化 + generated icon component”流水线。
6. “从锚点拖出创建新线”已完成 `Phase 1`：
   - `packages/core/src/utils/anchors/index.ts` 已新增 `resolvePreferredCreateAnchor(...)`
   - `packages/core/src/utils/anchors/__tests__/index.test.ts` 已补齐 4 个核心用例并通过测试

仍待完成：
1. Clipboard manager 与回归测试
2. `createLinkerDrag.startCreateFromShape(...)` 的 transaction 闭环
3. `InteractionMachine.startQuickCreateLinker(...)`
4. 右上角快捷建线 overlay UI

说明：
- `AI_KB` 下不再单独维护执行审查、基础差距、锚点建线专项计划；相关结论统一收敛到本文
- 当前 P0 总状态：
  - `P0-创建工具链路`：已完成
  - `P0-UI 壳层起步`：已完成
  - `P0-clipboard manager`：未完成，是当前唯一剩余 P0 阻塞项

---

## 0. 分析基线（本计划依据）

1. `.processon` 源码锚点：
- 吸附线：`designer.core.js:snapLine(5769)`、`snapResizeLine(5978)`
- 画布扩容：`designer.core.js:changeCanvas(6633)`
- 剪贴板：`designer.core.js:clipboard(6663+)`
- 控件反馈：`designer.core.js:drawControls(8861)`、`showLinkerControls(10575)`、`showAnchors(10689)`
- 历史系统：`designer.core.js:undoStack/redoStack(13144+)` + `designer.events.js:undoStackChanged/clipboardChanged(212+)`

2. draw.io / mxGraph 参考轴：
- `View/Model` 分离
- `Handler` 原语化交互体系
- `Overlay` 反馈层
- `Undo` 事务边界
- 路由与可读性（含 line jumps）

3. Diagen 当前对照入口：
- 坐标归一化：`packages/renderer/src/primitives/createCoordinateService.ts`
- 交互状态机：`packages/renderer/src/primitives/createInteractionMachine.ts`
- 历史事务：`packages/core/src/designer/managers/history.ts`
- 视图管理：`packages/core/src/designer/managers/view.ts`
- 工具态：`packages/core/src/designer/managers/tool.ts`
- UI 壳层承载点：`packages/ui/`

---

## 1. 目标与成功标准

### 1.1 目标（P0/P1）
1. P0：完成 shape/linker 正式创建链路（工具态进入画布创建）。
2. P0：落地 `clipboard manager`（copy/cut/paste/duplicate）并接入历史事务。
3. P0：开始建设 `packages/ui` 壳层组件（Sidebar / Topbar / TopMenu / ContextMenu）。
4. P1：为核心交互与 UI 壳层补齐回归测试与 playground 验证。

当前状态（2026-03-24）：
1. P0-1 已完成。
2. P0-2 未完成。
3. P0-3 已完成第一阶段目标，后续 Topbar / TopMenu / ContextMenu 继续按 P1/P2 推进。

### 1.2 成功标准（验收）
1. 拖拽/缩放时，吸附线与吸附行为稳定可见，误吸附可控（阈值可配置）。
2. 复制/剪切/粘贴支持多选、group 保真、ID 重映射，撤销重做行为正确。
3. 进入 shape/linker 工具后，可直接在画布创建块和线，不再依赖 playground 按钮。
4. `packages/ui` 输出可复用的 Sidebar / Topbar / TopMenu / ContextMenu 组件，并通过 playground 做最小集成。

---

## 2. 范围定义

### 2.1 本周期内（In Scope）
1. Guide 计算引擎（core）+ Guide overlay（renderer）。
2. Clipboard 语义与命令入口（core 优先，UI 仅薄层绑定）。
3. Shape/linker 正式创建工具链路。
4. `packages/ui` 壳层组件基础实现与 playground 集成。
5. 单元测试与最小集成回归（交互链路 + UI 壳层）。

### 2.2 本周期外（Out of Scope）
1. 评论系统完整产品化（仅保留接口位）。
2. 全量导出体系（PNG/PDF/SVG 完整参数面板）。
3. 实时协作协议与远端冲突合并。
4. 完整设计系统与主题定制平台。

### 2.3 当前主要差距与执行前提
1. 当前最大差距不是“不能编辑”，而是“创建还不是一等交互能力”。
2. P0 主缺口仍是：
   - clipboard manager
   - 从锚点拖出新 linker 的独立快捷入口
3. 已具备的开工前提：
   - `tool manager`、`history.transaction`、`InteractionOverlay`、`createInteractionMachine`、坐标归一化链路均已存在
   - `resolvePreferredCreateAnchor(...)` 已落地，可作为快捷建线唯一 source anchor 决策入口
4. 当前主要工程风险：
   - 交互回归测试仍偏薄
   - 创建链路若不统一走 transaction，容易产生临时 linker 泄漏或 undo 粒度错误

---

## 3. 详细执行计划（D1-D10）

### Week 1

### D1：技术方案冻结与任务拆解
1. 完成创建工具态接口草案，明确 `tool manager` 放入 `core`。
2. 明确事务边界：工具态是运行时状态，不进入 Diagram；一次用户创建动作对应一个 history entry。
3. 输出：`AI_KB` 设计补充条目 + 开发任务清单。

当前状态（2026-03-19）：已完成。  
补充：`core` 已新增 `tool manager`，运行时支持 `idle / create-shape / create-linker`。

### D2：创建工具基础设施
1. 将工具态纳入 `EditorState`，作为正式运行时状态。
2. 在 `RendererContainer` 接入 `Esc` 退出与基础 cursor 反馈。
3. 输出：可被后续 D3-D5 复用的 `tool` API 与回归测试。

当前状态（2026-03-19）：已完成。  
补充：已新增 `toolManager.test.ts`；当前仅完成基础设施，尚未接入画布点击创建。

### D3：shape 点击落点创建
1. 在 `renderer` 将 `create-shape` 工具态转为画布点击创建命令。
2. 创建后自动选中，支持 `continuous` 连续创建。
3. 输出：最小可用的画布创建闭环与回归测试。

验收：点击画布即可创建 shape，`Esc` 可退出工具态。

当前状态（2026-03-24）：已完成。  
补充：
- `packages/renderer/src/components/RendererContainer.tsx` 已接线 `startShapeCreate(...)`
- `create-shape` 下点击空白画布即可创建 shape
- `continuous = false` 时创建后会自动退出工具态

### D4：从锚点拖出创建新 linker
1. 在选中 shape 的 overlay 暴露出线手柄。
2. 按下时创建临时 linker，并切入现有 `linkerDrag` 链路。
3. 输出：连接成功提交，取消时回滚的事务闭环。

验收：从锚点拖出可直接完成新线创建，不再依赖 demo 按钮。

当前状态（2026-03-23）：
- 已完成前置 `Phase 1`：`core` 锚点决策 helper
- 已完成工具态下的两类正式建线入口：
  - `RendererContainer.tsx`：从空白点开始创建 linker
  - `CanvasRenderer.tsx`：`create-linker` 模式下点按 shape 直接进入快速建线
- 未完成右上角快捷建线 overlay 与专用 transaction/machine API 收口
- 该项已拆分为独立专项计划，按 `Phase 2 -> Phase 3 -> Phase 4` 推进

### D5：Week1 集成与回归
1. 清理工具态 API 命名与 Renderer 接线。
2. 执行核心回归测试（工具切换、创建、撤销重做）。
3. 输出：Week1 集成报告（问题清单 + 修复优先级）。

验收：P0 功能基础闭环可用，已知问题可追踪。

### Week 2

### D6：Clipboard Manager 设计与实现（core）
1. 新增 clipboard 数据结构与序列化协议。
2. 实现 `copy/cut/paste/duplicate`，支持 ID 重映射。
3. 输出：group/linker 引用关系保持策略（含降级规则）。

验收：多选复制后粘贴结果结构完整、引用正确、无 ID 冲突。

### D7：Clipboard 与历史/交互接入
1. 将 clipboard 动作纳入 transaction scope。
2. 绑定快捷键/命令入口（renderer 或 playground 层）。
3. 输出：撤销重做覆盖 copy/cut/paste/duplicate。

验收：每次粘贴为单独可撤销单元；cut 可完整恢复。

### D8：packages/ui 基础壳层搭建
1. 在 `packages/ui` 建立导出结构、基础样式与组件约定。
2. 明确组件边界：只负责菜单/栏位/弹层，不承载图语义和 history。
3. 输出：`Sidebar / Topbar / TopMenu / ContextMenu` 的组件骨架与基础 props。

验收：`packages/ui` 不再是占位包，四类组件可被 playground 引用。

当前状态（2026-03-19）：
- 已完成第一阶段：`packages/ui` 已建立 `tsdown` 构建、标准导出与 `Sidebar` 第一版。
- playground 已完成 `Sidebar + Toolbar + designer-ui bridge` 最小集成，当前 Topbar / TopMenu / ContextMenu 仍待实现。
- 已新增 `packages/designer-ui` bridge 包，并落地 `createToolbarBridge`、`createShapeLibraryBridge`、`createSidebarActionBridge`。
- playground 顶部工具栏与左侧 Sidebar 的 `Designer` 接线已迁移到 bridge 层。

### D9：UI 壳层组件最小闭环
1. `Sidebar`：图元分类/工具入口容器。
2. `Topbar / TopMenu`：文件、编辑、视图类菜单承载。
3. `ContextMenu`：右键命令菜单承载，可由应用层注入菜单项。

验收：playground 可用 `packages/ui` 组件组合出基本编辑器壳层。

### D10：封板与知识库同步
1. 合并本周期文档：架构、集成点、对照结论。
2. 形成版本说明（新增能力、限制、已知问题），明确 `ui` 与 `renderer` 的边界。
3. 输出：下一周期滚动 backlog（按优先级排序）。

验收：功能、文档、测试三者一致，可进入下一迭代。

---

## 3.1 D4 专项拆解：从锚点拖出创建新线

目标：
1. 将“从 shape 锚点拖出创建新线”完整接入 `core / renderer / history`。
2. 保持代码精简、健壮、可持续，避免临时逻辑堆进 overlay 或重复实现已有拖拽系统。

当前进度（2026-03-23）：
1. `Phase 1` 已完成：
   - `packages/core/src/utils/anchors/index.ts` 已新增 `resolvePreferredCreateAnchor(...)`
   - 已新增 `PreferredCreateAnchor` / `PreferredCreateFixedAnchorInfo`
   - `packages/core/src/utils/anchors/__tests__/index.test.ts` 已补齐 4 个核心用例并通过
2. 待完成：
   - `Phase 2`：`createLinkerDrag.startCreateFromShape(...)`
   - `Phase 3`：`InteractionMachine.startQuickCreateLinker(...)`
   - `Phase 4`：右上角快捷建线 overlay UI

强约束：
1. 不复制 `createLinkerDrag` 的拖拽、吸附、endpoint 解析逻辑。
2. 不在 `InteractionOverlay` 内直接维护临时 linker 生命周期。
3. 所有“新建 + 拖拽 + 完成/取消”必须属于同一个 history transaction。
4. 锚点选择规则统一走 `resolvePreferredCreateAnchor(...)`，不得在 renderer 再写一套判断。
5. renderer 只做触发、状态切换、可视化；不承载复杂几何决策。

禁止事项：
1. 不在 UI 组件中直接 `Schema.createLinker(...) + edit.add(...) + window mousemove`。
2. 不为“快捷建线”新写一套独立 drag session。
3. 不将菜单位置当作连线起点。
4. 不通过全局 `tool.create-linker` 硬拐到本次需求。

### Phase 1：Core 锚点决策

状态：
1. 已完成。
2. 完成日期：2026-03-23。

实际行为：
1. 优先 `direction === 'right'`
2. 回退 `direction === 'top'`
3. 再回退到“最接近右上参考点”的固定锚点
4. 最后回退 perimeter

已验收：
1. 标准四锚点矩形优先右侧锚点
2. 缺少右侧锚点时回退顶部锚点
3. 自定义锚点无 `direction` 时稳定选中固定锚点
4. 无固定锚点时返回 perimeter binding

### Phase 2：Renderer 建线主链路

目标：
1. 给现有 `linkerDrag` 增加“创建新线再进入拖拽”的正式 API。

修改范围：
1. `packages/renderer/src/primitives/createLinkerDrag.ts`

建议新增：
1. `startCreateFromShape(e, { sourceShapeId, linkerId })`

建议内部重构：
1. 抽出统一的 transaction/session 初始化函数
2. 抽出统一的 `setupDragState(...)`
3. 抽出统一的 `finalizeCreateResult(...)`

行为要求：
1. 创建临时 linker 时，`from` 已绑定 source shape 的 preferred anchor
2. `to` 初始与 `from` 相同，立即以 `mode = 'to'` 进入拖拽
3. 若未超过阈值，`transaction.abort()` 必须删除临时线
4. 若拖拽成功但未命中目标 shape，可保留自由线
5. 若成功绑定目标 shape，提交后默认选中新 linker

验收标准：
1. 一次快捷建线只占用一个 undo 单元
2. undo 后整条新线消失，而不是只回滚 endpoint
3. cancel 后没有孤儿 linker 留在图里
4. 现有“编辑已有 linker”链路不回归

### Phase 3：Interaction Machine 接口收口

目标：
1. 给外部组件一个稳定的“一次性快捷建线”入口，不直接调用 `linkerDrag` 内部细节。

修改范围：
1. `packages/renderer/src/primitives/createInteractionMachine.ts`

建议新增：
1. `startQuickCreateLinker(e, { sourceShapeId, linkerId })`

要求：
1. 只负责模式切换和能力转发
2. 不直接参与 linker 创建细节
3. 与 `startLinkerDrag(...)` 保持同级

### Phase 4：Overlay 与交互呈现

目标：
1. 给单选 shape 提供右上角快捷建线入口。

修改范围：
1. `packages/renderer/src/components/InteractionOverlay.tsx`
2. 可选新增 `packages/renderer/src/components/ShapeLinkerQuickCreateOverlay.tsx`

UI 要求：
1. 仅当单选一个可连接 shape 且 machine idle 时显示
2. 挂在选中框右上角外侧
3. 提供 3 个 action：折线、直线、曲线
4. `onMouseDown` 直接调用 `pointer.machine.startQuickCreateLinker(...)`

测试要求：
1. Core：`resolvePreferredCreateAnchor` 已完成定向测试
2. Renderer 后续至少覆盖：
   - `startCreateFromShape` 成功创建临时 linker
   - 阈值内结束回滚
   - 阈值外结束提交
   - 命中 shape 时 endpoint 绑定正确
   - 未命中 shape 时自由线保留
   - undo/redo 正确删除与恢复整条线

当前下一步：
1. 直接进入 `Phase 2`
2. 先完成 transaction 闭环，再接 machine，最后挂 overlay UI

---

## 4. 交付物清单（本周期）

1. Guide：计算模块 + overlay 渲染 + 交互接线 + 测试。
2. Clipboard：manager + 命令入口 + 历史事务接入 + 测试。
3. 创建工具链路：shape/linker 工具态接入画布创建。
4. UI 壳层：`packages/ui` 下 Sidebar / Topbar / TopMenu / ContextMenu。
5. 文档：`AI_KB` 对应章节更新（架构、集成点、路线图）。

当前补充：
- 第 2 项是当前唯一剩余 P0 主项
- 第 3 项中的 shape/linker 正式创建链路已完成；独立的右上角快捷建线 overlay 仍未闭环
- 第 4 项中 `Sidebar`、`Toolbar`、`designer-ui bridge` 已落地，`Topbar / TopMenu / ContextMenu` 仍待补齐

---

## 5. 风险、依赖与缓解

1. 风险：UI 壳层反向侵入 `renderer/core`，把应用逻辑写回基础层。  
缓解：`packages/ui` 只做组件容器与菜单呈现，不直接依赖图语义写操作。

2. 风险：Clipboard 与 group/linker 关系重建出现脏引用。  
缓解：先做纯模型层单测，再接 UI 命令入口。

3. 风险：创建工具链路与现有 drag/select 状态机冲突。  
缓解：所有创建入口统一经 `tool manager` 分发，避免在 `RendererContainer` 内新增隐式分支。

4. 依赖：统一 history 事件类型与事务提交时机。  
缓解：D1-D5 先冻结创建工具事务边界，D6-D10 做集中回归。

---

## 6. 测试策略（最小必做）

1. 单元测试：
- Tool：工具态切换、清空、连续模式。
- Clipboard：ID 重映射、group 保真、linker 端点降级。
- UI：菜单开关、菜单项事件派发、基础可访问性。
- Anchors：`resolvePreferredCreateAnchor` 的方向优先级、稳定回退与 perimeter 回退。

2. 集成回归：
- 创建/拖拽/连线/粘贴/撤销重做串行场景。
- 缩放比例变化下坐标一致性（依赖 `createCoordinateService`）。
- playground 中 `packages/ui` 壳层与 `renderer` 组合场景。

3. 手工验证（playground）：
- 中高密度图场景操作 10-15 分钟，观察稳定性与性能。

---

## 7. 两周后计划（简版，滚动动态调整）

1. P2：评论系统最小闭环（锚点、面板、持久化接口），按产品反馈拆分。
2. P2：导出能力分阶段补齐（先 SVG/PNG，再 PDF 与高级选项）。
3. P3：协作能力预研（操作日志协议、冲突策略、远端回放）。
4. 每周固定一次滚动评审：只保留下一周的细化计划，后续保持轻量 backlog。

说明：
- 评论仍属于应用层，不进入基础架构与 `packages/ui` 基础组件计划。

---

## 8. 计划维护规则

1. 本文是近期执行基线，按周更新，不做长期瀑布式承诺。
2. 若 P0 未完成，不并行开启新 P2 功能开发。
3. 每次调整必须同步更新 `AI_KB/README.md` 的“当前版本要点”与本文件日期。

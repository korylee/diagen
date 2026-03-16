# `.processon` 深度对照与可迁移经验（2026-03-13）

本文件直接基于仓库内 `.processon/` 源码分析，目标是识别：
1. `.processon` 已验证的高价值机制；
2. Diagen 当前已吸收与未吸收部分；
3. 未来 1-2 周内可执行的落地顺序。

参考源码：
- `.processon/designer.core.js`
- `.processon/designer.events.js`
- `.processon/designer.methods.js`
- `.processon/designer.ui.js`

---

## 1. 架构形态差异（先看根本）

### `.processon`
- 单体对象风格：`Model / Utils / Designer / MessageSource` 彼此高耦合。
- 渲染、交互、状态、UI 菜单、导出、评论在同一生命周期中串接。
- 优点：功能闭环完整、落地快。
- 代价：边界模糊、测试困难、重构风险高。

### Diagen
- 分层明确：`core`（语义状态）/ `renderer`（呈现与交互）/ `primitives`（浏览器能力）。
- 优点：可维护、可测试、可替换。
- 代价：部分 `.processon` 现成功能尚未补齐。

---

## 2. 坐标体系与输入归一化

### `.processon` 关键机制
- 数值缩放协议：
  - `Number.prototype.toScale` / `restoreScale`（`designer.core.js:13395`）
  - `Utils.toScale/restoreScale`（`designer.core.js:11902`）
- 指针归一化：
  - `Utils.getRelativePos(pageX, pageY, container)` 同时考虑 `offset + scroll`（`designer.core.js:12153`）

### Diagen 对应实现
- `packages/core/src/utils/transform.ts`
- `packages/renderer/src/primitives/createCoordinateService.ts`
  - `eventToCanvas / eventToScreen / screenToCanvas / canvasToScreen`

### 结论
- Diagen 已实现“统一坐标入口”，且比 `.processon` 更解耦。
- 文档层面需要统一改写为 `createCoordinateService`（已在 AI_KB 修正）。

---

## 3. 控制层与可视化反馈（Selection/Anchor/Linker Controls）

### `.processon` 关键机制
- `drawControls`（`designer.core.js:8861`）
- `showAnchors`（`designer.core.js:10689`）
- `showLinkerControls`（`designer.core.js:10575`）
- 均以 screen 层 DOM/Canvas 进行控件绘制。

### Diagen 对应实现
- `packages/renderer/src/components/InteractionOverlay.tsx`
- `SelectionOverlay / AnchorPreview / LinkerSelectionOverlay`

### 结论
- 控件分层思想已追平。
- 缺口不在“有没有控件”，而在“控件与吸附/路由联动完整度”。

---

## 4. 吸附线与对齐机制（当前最大功能差距）

### `.processon` 关键机制
- 移动吸附：`snapLine`（`designer.core.js:5769`）
  - 同时处理中心线、边线、容器附着、视觉吸附线。
- 缩放吸附：`snapResizeLine`（`designer.core.js:5978`）
  - 处理 resize 方向约束 + 中线/边线吸附。

### Diagen 当前状态
- 有连线端点吸附（`createLinkerDrag.ts`）
- 无 shape move/resize 通用吸附线系统

### 结论
- 这是最影响编辑效率的缺口；
- 建议以 overlay 方式实现 guide line（计算在 canvas，绘制在 screen）。

---

## 5. 自动扩容与边缘滚动

### `.processon` 关键机制
- `changeCanvas`（`designer.core.js:6633`）
  - 元素越界即调整页面尺寸。
- 拖拽期间伴随边缘滚动（事件链散布在 core/events）。

### Diagen 对应实现
- `view.ensureContainerFits/scheduleAutoGrow/flushAutoGrow`
  - `packages/core/src/designer/managers/view.ts`
- `RendererContainer.autoScrollOnEdge`
  - `packages/renderer/src/components/RendererContainer.tsx`

### 结论
- Diagen 在实现质量上更优（RAF 合并队列、配置化阈值）。

---

## 6. 剪贴板语义（第二大功能差距）

### `.processon` 关键机制
- `clipboard.copy/cut/paste/duplicate`（`designer.core.js:6663`）
- 支持：
  - 批量复制与重映射 ID
  - group 关系保真
  - linker 端点在跨上下文时降级处理
  - 与 UI 状态联动（`designer.events.js:212`）

### Diagen 当前状态
- 尚未形成统一 clipboard 模块
- Playground 层仅有基础编辑行为

### 结论
- 应在 core 新增 clipboard manager，避免把语义塞进 UI 层。

---

## 7. 历史系统与命令批处理

### `.processon` 关键机制
- `undoStack/redoStack + batchSize + submit`（`designer.core.js:13139`）
- UI 联动事件：`undoStackChanged/redoStackChanged`（`designer.events.js:219`）
- 同时兼容协作消息发送（`MessageSource.send/receive`）

### Diagen 对应实现
- `createHistoryManager` + `transaction.createScope`
- `renderer` 拖拽会话通过 `createTransactionalSession` 自动开启/提交事务

### 结论
- Diagen 的本地历史架构已具备升级协作层的基础。
- 需补齐：历史事件类型定义与实际 emit 的一致性。

---

## 8. 页面 line jump、导出、评论（产品能力层）

### `.processon` 已有
- `lineJumps` UI 开关与重算链路（`designer.ui.js:826`）
- 导出入口（`designer.ui.js:591/970`）
- 评论面板与评论渲染（`designer.ui.js:5816` 等）

### Diagen 当前
- 模型层有 `lineJumps` 字段，但主渲染链未完整接入。
- 模型层有 `comments` 字段，但无交互与面板闭环。
- 导出能力未形成产品链路。

### 结论
- 这些能力属于 P2/P3 范围，不建议在 P0 阶段并行推进。

---

## 9. 对照矩阵（简版）

- 已追平或更优：
  - 坐标归一化
  - 控制层分离
  - 自动扩容与边缘滚动
  - 事务化历史
- 主要差距：
  - move/resize 吸附线
  - 剪贴板语义
  - line jump 主链路
  - 导入导出、评论、产品化面板

---

## 10. 可迁移原则（只迁机制，不迁单体实现）

1. 坐标与事件入口必须单一。
2. 交互反馈统一在 overlay，模型计算留在 core。
3. 复杂编辑动作必须事务化（一个动作一个 undo 单元）。
4. 产品能力（导出/评论）和核心编辑链路分层推进。

---

## 11. 对 Diagen 的直接行动建议

1. 先补吸附线（move/resize），提升编辑效率与“可控感”。
2. 再补 clipboard manager，建立结构化复制粘贴语义。
3. 然后接入 line jump 与路由主链路，提升连线可读性。
4. 最后补评论/导出等产品层功能，避免核心链路被 UI 反向耦合。

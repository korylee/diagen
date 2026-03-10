# draw.io / mxGraph 对照要点

本文件基于 mxGraph（draw.io 底层图形引擎）公开 API 与架构习惯整理，目标是提炼可迁移原则，而非逐行复刻实现。

---

## 1. 视图层职责：`mxGraphView`

mxGraph 关键思想：
- 视图变换统一由 `scale + translate` 管理。
- 事件命中、渲染输出、辅助层都围绕同一视图参数展开。

对 Diagen 的启发：
- `view manager` 应作为唯一视图参数源。
- 渲染层不应分散定义多套“局部 zoom/pan 规则”。

---

## 2. 交互处理器拆分：`Handler` 系列

典型组件：
- `mxGraphHandler`：节点移动、预览、约束
- `mxRubberband`：框选
- `mxPanningHandler`：平移
- `mxGuide`：对齐辅助

核心思想：
- 交互“意图判定”与“模型变更提交”分离。
- 预览层是临时态，不直接污染文档模型。

Diagen 当前对应：
- primitives（`createShapeDrag/createResize/createSelection/createPan`）承担 handler 角色
- core managers 承担模型提交角色
- overlay 承担临时视觉反馈

---

## 3. 框选（Rubberband）机制

mxGraph 经验：
- 框选是独立模块，不与元素渲染耦合
- 通常采用屏幕层绘制 + 模型层命中

Diagen 对应：
- `createSelection` 维护 canvas bounds
- `RendererContainer` 将其转换为 screen bounds 渲染到 overlay

---

## 4. 平移与缩放

mxGraph 经验：
- panning handler 与 graph view 协同，避免多处并行修改坐标系。
- zoom 通常围绕指定中心点进行变换。

Diagen 对应：
- `view.setZoom(newZoom, center)` 支持缩放中心
- `eventToCanvasPoint` 保证中心点换算一致

---

## 5. 对齐辅助（Guide）与可扩展性

mxGraph 经验：
- guide 是可插拔层，不应嵌入元素本体绘制流程

Diagen 设计建议：
- 将对齐线作为 overlay 子模块实现
- 计算在 canvas 坐标，显示在 screen 坐标

---

## 6. 概览图（Outline）思路

mxGraph 经验：
- `mxOutline` 将主视图状态映射到小地图
- 需要稳定的视图变换和可见区域计算

Diagen 前提条件：
- `view.viewport` + `viewportSize` + `containerSize` 已具备基础
- 后续可基于 `getVisibleCanvasArea` 构建 minimap

---

## 7. 与 Diagen 的关键一致性目标

1. 坐标语义一致：
- 同层只允许一种坐标语义（canvas 或 screen）

2. 输入归一化一致：
- 所有 pointer/wheel 事件先统一归一化，再进入交互逻辑

3. 临时态与文档态一致：
- 交互预览不进入 Diagram 持久化结构

---

## 8. 结论

draw.io/mxGraph 最值得迁移的是“分层与职责边界”：
- View 负责变换
- Handler 负责交互判定
- Overlay 负责反馈
- Model 负责语义状态

Diagen 当前已经具备该结构雏形，后续扩展（guide/outline/高级连线编辑）会更稳。

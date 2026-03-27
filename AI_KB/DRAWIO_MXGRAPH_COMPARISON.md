# draw.io / mxGraph 对照与 Diagen 映射（2026-03-13）

本文件只回答两个问题：
1. draw.io/mxGraph 的哪些结构原则值得继续借鉴；
2. 这些原则在 Diagen 中映射到哪里。

说明：此处参考的是 mxGraph 的稳定架构思想（View/Model/Handler/Undo/Overlay），不是逐行复刻 draw.io 实现。

---

## 1. View-Model 分离

### mxGraph
- `mxGraphView` 负责 `scale + translate` 与 cell state 投影。
- `mxGraphModel` 负责语义数据，不持有 DOM 运行态。

### Diagen 映射
- View：`packages/core/src/designer/managers/view.ts`
- Model：`packages/core/src/model/*`

### 结论
- 该分离已经成立，需持续避免将 `viewportRect` 等 DOM 信息写入模型。

---

## 2. Handler 体系（交互原语化）

### mxGraph
- `mxGraphHandler`（移动）
- `mxRubberband`（框选）
- `mxPanningHandler`（平移）
- `mxConnectionHandler`（连线）
- `mxGuide`（吸附辅助）

### Diagen 映射
- `createShapeDrag` / `createSelection` / `createPan` / `createLinkerDrag` / `createResize` / `createRotate`
- 统一状态机：`createInteractionMachine`

### 结论
- Handler 架构已对齐。
- 当前缺口集中在 `mxGuide` 对应能力（move/resize 吸附线）。

---

## 3. Overlay 反馈层

### mxGraph
- 预览、控制点、辅助线通常作为独立 overlay，不污染模型。

### Diagen 映射
- `packages/renderer/src/components/InteractionOverlay.tsx`
- `RendererContainer` 的 `overlay-layer`

### 结论
- 结构正确；后续新增 guide line 建议继续放 overlay。

---

## 4. Undo/Redo 与事务边界

### mxGraph
- `mxUndoManager` 维护可回放编辑动作。
- 强调“一个用户动作 = 一个撤销单元”。

### Diagen 映射
- `createHistoryManager`
- `history.transaction.createScope`
- `createTransactionalSession`

### 结论
- 机制已到位；需补类型与事件一致性，以及更多交互回归测试。

---

## 5. 连线路由与可读性

### mxGraph / draw.io 通常做法
- 提供正交、折线、曲线路线策略。
- 在密集场景引入跳线（line jumps）与碰撞规避。

### Diagen 映射
- 已有路由库：`packages/core/src/utils/router/*`
- 当前主链路已通过统一入口 `calculateLinkerRoute` 接入 `view` 布局分发

### 结论
- 关键差距已从“是否接入”转为“路径质量、视觉细节与复杂场景策略”。

---

## 6. 与 `.processon` 的三方对照

- `.processon` 强在“功能闭环完整”。
- mxGraph 强在“抽象与职责边界清晰”。
- Diagen 当前更接近 mxGraph 架构，但功能面还未追上 `.processon`。

对当前阶段最优策略：
- 继续走 mxGraph 的结构边界；
- 在该边界内补齐 `.processon` 的高价值能力（吸附线、剪贴板、line jump）。

---

## 7. 小结

draw.io/mxGraph 对 Diagen 的最大价值不是“某个 API 名字”，而是：
- View/Model/Handler/Overlay/Undo 的职责边界。

Diagen 已具备这套边界；具体优先级和排期请看 `ROADMAP.md`，这里不重复展开。

补充边界：
- 评论/批注不属于基础架构能力，若有需求应在应用层基于 `core + renderer` 组合实现，而不是进入 `Diagram` 根模型。

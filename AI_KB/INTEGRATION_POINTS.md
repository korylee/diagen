# AI 接入要点

## 1. 推荐入口（core）
- 设计器工厂：`packages/core/src/designer/index.ts` 的 `createDesigner`
- manager 入口：
  - `element` / `edit` / `selection` / `history` / `view`
- 文档输入输出：
  - `serialize()`
  - `loadFromJSON()`

## 2. 可直接驱动能力（面向 AI 指令）
- 元素增删改：
  - `edit.add(...)`
  - `edit.create(...)`
  - `edit.update(id, patch)`
  - `edit.remove(ids)`
- 几何与布局：
  - `edit.move(ids, dx, dy)`
  - `element.align(ids, type)`
  - `element.distribute(ids, type)`
- 分组与层级：
  - `element.group(ids)` / `element.ungroup(groupId)`
  - `element.toFront(...)` / `toBack(...)` / `bringForward(...)` / `sendBackward(...)`
- 历史：
  - `history.undo()` / `history.redo()`

## 3. 视图与坐标集成注意点
- 缩放与平移统一走 `view`：
  - `view.setZoom(...)`
  - `view.setPan(...)` / `view.pan(...)`
  - `view.toScreen(...)` / `view.toCanvas(...)`
- renderer 事件坐标统一入口：
  - `eventToCanvasPoint`（`packages/renderer/src/utils/pointer.ts`）
  - 通过 `Interaction` 暴露能力 `eventToCanvas`（避免直接耦合 viewport DOM）

## 4. 渲染层接入点（UI/交互扩展）
- 交互容器：`packages/renderer/src/components/RendererContainer.tsx`
- 元素渲染：`packages/renderer/src/canvas/CanvasRenderer.tsx`
- 覆盖层：`packages/renderer/src/components/InteractionOverlay.tsx`

## 5. 事件订阅点（行为审计/埋点）
- 元素事件（core emitter）：
  - `element:added`
  - `element:removed`
  - `element:updated`
  - `element:moved`
  - `element:cleared`
- 触发位置：`packages/core/src/designer/managers/element.ts`

## 6. 实用接入建议
- AI 执行批量编辑时，优先进入 `history.transaction`（已有 primitives 已大量采用）。
- 不把 UI 几何状态写入 Diagram（如 viewportRect、hoverRect、drag ghost）。
- 需要做命中判断时，统一先归一化到 canvas 坐标再进入 core 判断逻辑。

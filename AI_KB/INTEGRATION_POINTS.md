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
  - `history.transaction.createScope(name)`

## 3. 视图与坐标集成注意点
- 缩放与平移统一走 `view`：
  - `view.setZoom(...)`
  - `view.setPan(...)` / `view.pan(...)`
  - `view.toScreen(...)` / `view.toCanvas(...)`
- renderer 坐标统一入口：
  - `packages/renderer/src/primitives/createCoordinateService.ts`
  - `eventToCanvas(event)` 作为交互输入标准

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
- 历史事件：
  - `history:undo`
  - `history:redo`

## 6. 实用接入建议
- 批量编辑优先放进 transaction，避免 undo 栈碎片化。
- 不把 UI 几何临时态写入 Diagram（如 hover、drag ghost、DOM rect）。
- 命中和吸附计算都以 canvas 坐标为准，overlay 只做 screen 呈现。

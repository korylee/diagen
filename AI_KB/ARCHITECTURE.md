# 架构总览（2026-03-13）

## 1. 包级分层
- 领域核心：`@diagen/core`
  - 文档模型（Diagram）
  - 编辑器状态（viewport/container/selection/history）
  - 变换、路由、几何算法
- 渲染与交互：`@diagen/renderer`
  - Solid 组件树
  - Canvas 元素渲染
  - 交互状态机与 UI 覆盖层
- 基础能力：`@diagen/shared`
  - 通用类型（Point/Bounds）
  - 数学与对象工具
- 浏览器原语：`@diagen/primitives`
  - scroll、event listener、resize observer、element rect

## 2. 状态边界（关键）
- 持久化文档态（可 `serialize`）：
  - `diagram`（elements/orderList/page/theme...）
- 编辑器运行态（非文档）：
  - `viewport`（x/y/zoom）
  - `viewportSize`、`containerSize`
  - 交互会话态（drag/resize/selection 临时状态）
- 结论：
  - DOM 几何信息（如 `viewportRect`）不进入 `diagram`。

## 3. 坐标系统
- Canvas 坐标：模型语义坐标（元素 x/y/w/h 等）
- Screen 坐标：视口下像素坐标
- 核心公式（`packages/core/src/utils/transform.ts`）：
  - `screen = canvas * zoom + viewportOffset`
  - `canvas = (screen - viewportOffset) / zoom`

## 4. 事件坐标归一化
- 单一入口：`packages/renderer/src/primitives/createCoordinateService.ts`
  - `eventToScreen`
  - `eventToCanvas`
  - `screenToCanvas`
  - `canvasToScreen`
- 价值：
  - 避免容器、元素、覆盖层重复维护坐标换算逻辑。

## 5. 容器渲染分层
文件：`packages/renderer/src/components/RendererContainer.tsx`

- `world-layer`
  - 有 transform（`translate + scale`）
  - 放世界层背景（当前网格）
- `scene-layer`
  - 无 transform
  - 元素渲染层（ShapeCanvas/LinkerCanvas，屏幕坐标定位）
- `overlay-layer`
  - 无 transform
  - 选框、框选、手柄、锚点等交互覆盖

## 6. 交互链路（简化）
1. 事件进入 `RendererContainer`
2. 通过 `coordinate.eventToCanvas` 归一化到 canvas 坐标
3. primitives 判定动作（pan/drag/resize/boxSelect/linkerDrag）
4. 调用 core managers（`edit/selection/view/history`）
5. Solid 响应更新 scene 与 overlay

## 7. 与 `.processon` / draw.io 的映射
- `.processon` 的 `toScale/restoreScale/getRelativePos`：
  - 对应 Diagen 的 `transform.ts + createCoordinateService`
- `.processon` 的 `drawControls/showAnchors/showLinkerControls`：
  - 对应 `InteractionOverlay`
- draw.io/mxGraph 的 View 与 Handler 分层：
  - 对应 `view manager` 与 `renderer/primitives` 分离

## 8. 当前主要架构风险
- `router` 能力已实现，但尚未接入主连线路由链路。
- 缺少 move/resize 吸附线机制，影响复杂排版效率。
- 测试偏重 `core/utils`，交互层缺少自动化回归。

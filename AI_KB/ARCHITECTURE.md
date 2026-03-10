# 架构总览（2026-03-11）

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
  - scroll、event listener、debounce 等

## 2. 状态边界（关键）
- 持久化文档态（可 `serialize`）：
  - `diagram`（elements/orderList/page/theme...）
- 编辑器运行态（非文档）：
  - `viewport`（x/y/zoom）
  - `viewportSize`、`containerSize`
  - 交互会话态（drag/resize/selection 临时状态）
- 结论：
  - 运行时 DOM 信息（如 viewportRect）不应进入 `diagram`。

## 3. 坐标系统
- Canvas 坐标：模型语义坐标（元素 x/y/w/h 等）
- Screen 坐标：当前视口下的像素坐标
- 核心公式（`packages/core/src/utils/transform.ts`）：
  - `screen = canvas * zoom + viewportOffset`
  - `canvas = (screen - viewportOffset) / zoom`
- 已修复要点：
  - `screenToCanvas(Bounds)` 的 `w/h` 采用 `/ zoom`（非 `* zoom`）。

## 4. 事件坐标归一化
- 单一入口：`packages/renderer/src/utils/pointer.ts`
  - `eventToViewportPoint`
  - `eventToCanvasPoint`
- `Interaction` 上下文暴露能力函数：
  - `eventToCanvas(event)`（不暴露 viewport DOM）
- 价值：
  - 避免容器、元素、覆盖层各自手写一套坐标换算。

## 5. 容器渲染分层（P2 后）
文件：`packages/renderer/src/components/RendererContainer.tsx`

- `world-layer`
  - 有 transform（`translate + scale`）
  - 主要放“世界空间内容”（当前网格）
- `scene-layer`
  - 无 transform
  - 元素渲染层（ShapeCanvas/LinkerCanvas，以屏幕坐标定位）
- `overlay-layer`
  - 无 transform
  - 选框、框选矩形、手柄、锚点等交互覆盖
  - 统一使用 screen bounds

## 6. 交互链路（简化）
1. 事件进入 `RendererContainer`
2. 通过 `eventToCanvas` 归一化到 canvas 坐标
3. primitives 判定动作（pan/drag/resize/boxSelect）
4. 调用 core managers（`edit/selection/view/history`）
5. Solid 响应更新 scene 与 overlay

## 7. ProcessOn/draw.io 启发在当前架构中的落点
- ProcessOn：
  - `toScale/restoreScale` 的对称思想 -> 当前 `transform.ts` 的可逆性测试
  - `getRelativePos + scroll` -> 当前 `eventToCanvasPoint`
  - 框选 screen 绘制 -> 提交前转模型 -> 当前 overlay 层框选呈现
- draw.io/mxGraph：
  - View（scale/translate）与 Handler（panning/rubberband/guide）解耦
  - 当前对应：`view manager` 与 `renderer/primitives` 分离

## 8. 现状与约束
- 当前为“过渡稳定态”：
  - world/scene/overlay 契约已经建立
  - 元素渲染仍是每元素独立 canvas 的屏幕定位模式
- 后续若继续演进，需保持：
  - 单一事件坐标入口不破坏
  - 同一层只允许一种坐标语义

# 架构概览

分层结构：
- 领域层 `@diagen/core`：定义图表数据模型、默认值、编辑器状态与命令管理
- 视图层 `@diagen/renderer`：Solid 组件与 Canvas 渲染，承载交互与视图更新
- 基础能力 `@diagen/shared`：工具、数学、事件与基础数据结构
- 交互原语 `@diagen/primitives`：通用交互/浏览器能力封装（事件监听、滚动、观察等）

核心数据流：
- `createDesigner` 创建编辑器状态（diagram + viewport + canvasSize）
- `designer.managers` 管理编辑逻辑
- 渲染层通过 `DesignerProvider` / `useDesigner` 读取状态并执行操作
- Canvas 层根据 `diagram.elements` 与 `orderList` 输出图形
- 交互动作（拖拽/框选/缩放/快捷键）由 `renderer` 的 primitives 捕获后，调用 `core` 的 managers 更新数据

交互与渲染链路（简化）：
- 鼠标事件进入 `RendererContainer`
- 交互原语决定动作类型（drag/pan/resize/boxSelect）
- 调用 `edit/selection/view/history` 等 manager 更新 `diagram` 或 `viewport`
- Solid 响应式触发 `CanvasRenderer` 重绘

坐标系统（来自 core 的设计约定）：
- 画布坐标：以 `page.width/height` 为逻辑尺寸
- 视口变换：`viewport` 提供偏移与缩放
- 转换公式：
- 屏幕坐标 = 画布坐标 * zoom + viewportOffset
- 画布坐标 = (屏幕坐标 - viewportOffset) / zoom

关键入口文件：
- 设计器核心：`packages/core/src/designer/index.ts`
- 元素管理：`packages/core/src/designer/managers/element.ts`
- 渲染入口：`packages/renderer/src/components/Renderer.tsx`
- Canvas 渲染：`packages/renderer/src/canvas/CanvasRenderer.tsx`

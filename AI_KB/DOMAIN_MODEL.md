# 领域模型与状态边界

## 1. 文档根模型：Diagram（持久化）
- 文件：`packages/core/src/model/diagram.ts`
- 主要结构：
  - `elements`：元素 map
  - `orderList`：渲染顺序
  - `page`：页面设置
  - `theme`、元信息（createdAt/updatedAt 等）
- 生命周期：
  - 创建：`createDiagram`
  - 持久化：`serialize()` / `loadFromJSON()`（通过 designer 暴露）

## 2. 页面模型：DiagramPage
- 文件：`packages/core/src/model/page.ts`
- 关键字段：
  - 尺寸：`width`、`height`
  - 布局：`padding`、`margin`
  - 网格：`showGrid`、`gridSize`、`gridColor`、`gridStyle`
  - 其他：`orientation`、`lineJumps`

## 3. 元素模型
- 基类：`packages/core/src/model/types.ts`
  - `id`、`type`、`locked`、`visible`、`group`、`parent`、`children`
- Shape：`packages/core/src/model/shape.ts`
  - 几何：`props`（x/y/w/h/angle）
  - 样式：`shapeStyle`、`lineStyle`、`fillStyle`、`fontStyle`
  - 内容：`textBlock`、`anchors`、`path`
  - 行为：`attribute`（可缩放/可连接等）
- Linker：`packages/core/src/model/linker.ts`
  - 端点：`from` / `to`（支持绑定 shape anchor）
  - 控制点：`points`
  - 样式：`lineStyle`、`fontStyle`

## 4. 编辑器运行态（非文档）
文件：`packages/core/src/designer/index.ts`

- `viewport`：`x/y/zoom`
- `viewportSize`：视口尺寸
- `containerSize`：容器尺寸（可被 autoGrow 扩容）
- `config.autoGrow`：扩容配置（padding/step/max 等）

注意：
- 这些状态不属于 Diagram 文档语义，不建议写入导出的 diagram JSON。
- DOM 几何（如 viewportRect）属于更短生命周期状态，应留在 renderer 层。

## 5. 交互会话态（renderer 临时态）
- 文件：`packages/renderer/src/primitives/`
- 典型状态：
  - `createDragSession`：start/last/isPending/isDragging
  - `createSelection`：startPoint/endPoint/bounds
  - `createResize`：targetId/direction/startBounds/startMouse
- 特征：
  - 仅服务当前交互过程
  - 不进入 `diagram` 持久化结构

## 6. 与 ProcessOn 数据差异（迁移时高频踩坑）
- ProcessOn 的 `props.zindex` 常与渲染顺序耦合；
  Diagen 以 `orderList` 为主。
- ProcessOn 某些运行态字段混在 definition 语义中；
  Diagen 更强调文档态与运行态分离。

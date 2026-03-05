# 领域模型要点

根模型（Diagram）：
- 文件：`packages/core/src/model/diagram.ts`
- 结构：`elements`（元素 map）、`orderList`（渲染顺序）、`page`（页面配置）、`theme`、元信息（createdAt/updatedAt 等）
- 创建/序列化：`createDiagram`、`serializeDiagram`、`deserializeDiagram`

页面（DiagramPage）：
- 文件：`packages/core/src/model/page.ts`
- 关键字段：`width`、`height`、`padding`、`margin`、`showGrid`、`gridSize`、`gridColor`

元素基类（BaseElement）：
- 文件：`packages/core/src/model/types.ts`
- 关键字段：`id`、`name`、`type`、`zIndex`、`locked`、`visible`、`group`、`parent`、`children`

形状元素（ShapeElement）：
- 文件：`packages/core/src/model/shape.ts`
- 几何：`props`（BoxProps：x/y/w/h/angle）
- 样式：`shapeStyle`、`lineStyle`、`fillStyle`、`fontStyle`
- 内容：`textBlock`、`anchors`、`path`
- 行为：`attribute`（可缩放/可移动/可连接等）

连线元素（LinkerElement）：
- 文件：`packages/core/src/model/linker.ts`
- 端点：`from` / `to`（可绑定 shape）
- 路径：`points`（自定义控制点）
- 样式：`lineStyle`、`fontStyle`

样式与默认值：
- 类型定义：`packages/core/src/model/types.ts`
- 默认值集合：`packages/core/src/constants.ts`（`DEFAULTS`）
- Schema 默认形状：`packages/core/src/schema/defaults.ts`

序列化与加载：
- 设计器提供 `serialize()` 与 `loadFromJSON()` 用于状态保存与恢复
- 位置：`packages/core/src/designer/index.ts`

# 领域模型与状态边界

## 1. `Diagram` 是当前唯一正式文档模型
文件：`packages/core/src/model/diagram.ts`

关键字段：
- `id`
- `name`
- `version`
- `elements`
- `orderList`
- `page`
- `theme`
- `createdAt`
- `updatedAt`
- `createdBy`
- `properties`

当前判断：
- `Diagram` 已足够表达当前正式导入导出的文件内容。
- 若后续进入多 page，优先直接扩展 `Diagram`。

## 2. 导入导出与宿主快照分层

### 正式文件格式
- `Diagram`

### 宿主本地快照
```ts
interface LocalSnapshot {
  diagram: Diagram
  view?: { x: number; y: number; zoom: number }
  activePageId?: string
  savedAt: number
}
```

理由：
- 正式导入导出语义最自然的是"一张图文件"
- `view / savedAt / activePageId` 属于宿主恢复需求，不属于正式交换格式

## 3. 页面模型 `DiagramPage`
文件：`packages/core/src/model/page.ts`

关键字段：
- `width / height`
- `padding / margin`
- `backgroundColor`
- `showGrid / gridSize / gridColor / gridStyle`
- `orientation`
- `lineJumps`

## 4. 元素模型

### 基类字段 `BaseElement`
文件：`packages/core/src/model/types.ts`

- `id`
- `name`
- `type`
- `locked`
- `visible`
- `group`
- `parent`
- `children`
- `category`
- `zIndex`

### Shape `ShapeElement`
文件：`packages/core/src/model/shape.ts`

- `props`
- `shapeStyle`
- `lineStyle`
- `fillStyle`
- `fontStyle`
- `textBlock`
- `anchors`
- `path`
- `attribute`
- `title`
- `link`
- `dataAttributes`
- `data`
- `theme`

### Linker `LinkerElement`
文件：`packages/core/src/model/linker.ts`

- `from: LinkerEndpoint` — 起始端点
- `to: LinkerEndpoint` — 结束端点
- `points` — 自定义路由控制点
- `routePoints` — 计算后的路由点
- `lineStyle`
- `fontStyle`
- `text` — 连线标签文本
- `textPosition: { dx, dy }` — 标签位置偏移
- `linkerType` — 连线类型（`broken | straight | curved | orthogonal`）
- `dataAttributes`
- `data`

端点模型 `LinkerEndpoint`（已收口）：
```ts
type LinkerEndpointBinding =
  | { type: 'free' }
  | { type: 'anchor'; anchorId: string }
  | { type: 'edge'; pathIndex: number; segmentIndex: number; t: number }

type LinkerEndpoint =
  | (Point & { angle?: number; binding: { type: 'free' } })
  | (Point & { angle?: number; target: string; binding: Exclude<LinkerEndpointBinding, { type: 'free' }> })
```

- `target`：端点连接的目标元素 ID
- `binding`：附着方式（自由 / 锚点 / 边上位置）
- 旧 `from.id / to.id` 口径已清理

## 5. 不应持久化的状态
文件：`packages/core/src/designer/types.ts`

以下字段属于运行时状态：
- `diagram`（文档态，作为 state 根字段）
- `transform`
- `viewportSize`
- `worldSize`
- `originOffset`
- `config`
- `tool`

## 6. 默认样式来源

默认样式常量定义在 `packages/core/src/schema/defaults.ts`：

```
DEFAULT_LINE_STYLE   → { lineWidth: 2, lineColor: '50,50,50', lineStyle: 'solid', ... }
DEFAULT_FILL_STYLE   → { type: 'solid', color: '255,255,255' }
DEFAULT_FONT_STYLE   → { fontFamily: '微软雅黑, Arial, sans-serif', size: 13, ... }
```

Schema 运行时注册入口（`packages/core/src/schema/Schema.ts`）：
- `setDefaultLineStyle(style)`
- `setDefaultFillStyle(style)`
- `setDefaultFontStyle(style)`

新建 shape / linker 时，Schema 将当前默认样式 merge 进定义，确保新元素继承默认样式。

## 7. 当前模型层缺口
- 编辑链路没有系统维护 `diagram.updatedAt`
- 缺少文档级 `schemaVersion`
- 缺少文档合法性校验入口
- 缺少脏状态与已保存文档状态表达

## 8. 后续建模约束
1. 所有新文档字段先判断是否属于 `Diagram` 语义。
2. 评论、权限、协作用户态应放在应用层。
3. 当前阶段不为旧格式做兼容建模。
4. 正式导入导出优先保持 `Diagram` 作为文件根。

## 9. 分页建模计划
若后续实现多 page，推荐模型方向：

```ts
interface Diagram {
  id: string
  name: string
  version: string
  pages: Record<string, DiagramPage>
  pageOrder: string[]
  createdAt: number
  updatedAt: number
  properties?: Record<string, unknown>
}

interface DiagramPage {
  id: string
  name: string
  width: number
  height: number
  backgroundColor: string
  elements: Record<string, DiagramElement>
  orderList: string[]
}
```

配套分层：
- `core` 负责 page 语义、页内元素操作、跨页操作、导入导出
- 应用层负责 page tabs、缩略图、排序交互、删除确认等 UI

---

最后更新：2026-04-28

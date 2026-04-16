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
- 若后续进入多 page，优先直接扩展 `Diagram`，而不是再包一层 `Document`。

## 2. 导入导出与宿主快照分层

### 正式文件格式
- `Diagram`

### 宿主本地快照
```ts
interface LocalSnapshot {
  diagram: Diagram
  view?: {
    x: number
    y: number
    zoom: number
  }
  activePageId?: string
  savedAt: number
}
```

理由：
- 正式导入导出语义最自然的是"一张图文件"
- `view / savedAt / activePageId` 属于宿主恢复需求，不属于正式交换格式
- 这样可以同时保持 `core` 协议简洁和宿主恢复能力

## 3. 页面模型 `DiagramPage`
文件：`packages/core/src/model/page.ts`

关键字段：
- `width / height`
- `padding / margin`
- `backgroundColor`
- `showGrid / gridSize / gridColor / gridStyle`
- `orientation`
- `lineJumps`

说明：
- 页面配置属于文档态，应参与导出与导入。

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
- `category`：元素类别（新增）
- `zIndex`：层级索引（新增）

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
- `title`：标题（新增）
- `link`：超链接（新增）
- `dataAttributes`：数据属性列表（新增）
- `data`：自定义数据（新增）
- `theme`：主题标识（新增）

### Linker `LinkerElement`
文件：`packages/core/src/model/linker.ts`

- `from / to`
- `points`
- `routePoints`
- `lineStyle`
- `fontStyle`
- `text`：连线标签文本（新增）
- `textPosition`：标签位置偏移 `{ dx, dy }`（新增）
- `linkerType`：连线类型（新增）
- `dataAttributes`：数据属性列表（新增）
- `data`：自定义数据（新增）

## 5. 不应持久化的状态
文件：`packages/core/src/designer/types.ts`

以下字段属于运行时状态：
- `diagram`：图表数据（虽为文档态，但作为 state 的根字段）
- `transform`
- `viewportSize`
- `worldSize`
- `originOffset`
- `config`
- `tool`

注意：
- 其中 `transform` 是否保留到宿主级 `LocalSnapshot.view` 是宿主决策，不是 `Diagram` 基础语义。
- `tool / originOffset / viewportSize` 明确不应进入导出文件。

## 6. 当前模型层缺口
- 编辑链路没有系统维护 `diagram.updatedAt`
- 缺少文档级 `schemaVersion`
- 缺少文档合法性校验入口
- 缺少脏状态与已保存文档状态表达

## 7. 后续建模约束
1. 所有新文档字段先判断是否属于 `Diagram` 语义，而不是先塞到运行时 state。
2. 评论、权限、协作用户态应放在应用层，不要直接加进 `Diagram`。
3. 当前阶段不为旧格式做兼容建模，协议变更时直接重构到位。
4. 正式导入导出优先保持 `Diagram` 作为文件根；宿主快照层不进入 `core` 正式协议。

## 8. 分页建模计划
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

运行时建议：
- `activePageId` 放在 `EditorState`
- 是否持久化"上次打开页"由宿主层决定，不默认进入正式文件协议

导入导出建议：
- 默认导入导出整份多 page `Diagram`
- 若后续支持"导出当前页"，作为衍生能力处理，不改变正式文件根模型

最后更新：2026-04-11
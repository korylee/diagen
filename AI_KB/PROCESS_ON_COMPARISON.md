# ProcessOn 关键对照点

本文件基于 `.processon/` 目录中的参考源码提炼，与本项目（diagen）做对照，便于后续 AI 接入与功能迁移时快速定位。

来源文件（.processon）：
- `designer.core.js`：核心数据结构（Model/Utils/MessageSource 等）
- `designer.methods.js`：对外方法与操作入口（open/align/distribute/layer/zoom 等）
- `designer.events.js`：事件监听与联动
- `designer.ui.js`：UI 层逻辑
- `schema.js`：形状/页面/默认值与 Schema 管理

## 一、Schema 与默认值

ProcessOn：
- `Schema.pageDefaults/shapeDefaults/linkerDefaults` 定义页面、形状、连线默认值。
- `Schema.addShape` / `Schema.addTheme` 注册形状与主题。
- `Schema.initShapeFunctions` 在形状对象上注入 `getPath()` / `getAnchors()` 等动态函数（通过字符串拼装函数体）。
- 形状结构含 `attribute`（container/rotatable/linkable/collapsable 等）、`textBlock`、`anchors`、`path`。

diagen 对应：
- 页面默认：`packages/core/src/model/page.ts`
- 形状/连线默认：`packages/core/src/model/shape.ts`、`packages/core/src/model/linker.ts`
- 常量与默认集合：`packages/core/src/constants.ts`（`DEFAULTS`）
- Schema 目录：`packages/core/src/schema/`

差异要点：
- ProcessOn 用“动态函数”生成 path/anchors；diagen 目前以“静态数据 + utils”表达。
- ProcessOn `shapeDefaults` 有 `groupName`、`resizeDir`、`props.zindex` 等字段；diagen 中部分字段未直接出现或由 `orderList` 管理。

## 二、Model 与数据持久化

ProcessOn（见 `designer.core.js`）：
- `Model.define`：当前图表定义（元素、页面、主题等）
- `Model.persistence`：持久化副本
- `orderList` + `maxZIndex`：渲染顺序与层级
- `groupMap` / `linkerMap`：分组与连线关系索引

diagen 对应：
- `Diagram`：`elements`（map）+ `orderList`（渲染顺序）
- `group` 字段直接挂在元素上（`BaseElement.group`）
- 当前未见 `maxZIndex` / `linkerMap` 的独立结构（由渲染/工具层计算）

迁移提示：
- 若从 ProcessOn 导入数据，需要将 `props.zindex` 映射为 `orderList`（或排序后写入）。

## 三、核心操作入口对照

ProcessOn（`designer.methods.js`）：
- `open`：加载 definition（page/elements/theme/defaultStyle 等）
- `alignShapes` / `distributeShapes`
- `layerShapes`（front/forward/back/backward）
- `group` / `ungroup`
- `lockShapes` / `unlockShapes`
- `setPageStyle`
- `zoomIn` / `zoomOut` / `setZoomScale`

diagen 对应：
- 加载/保存：`createDesigner().loadFromJSON()` / `serialize()`（`packages/core/src/designer/index.ts`）
- 对齐/分布：`element.align()` / `element.distribute()`（`packages/core/src/designer/managers/element.ts`）
- 分组：`element.group()` / `element.ungroup()`（同上）
- 图层：`element.toFront()` / `toBack()` / `bringForward()` / `sendBackward()`（同上）
- 缩放：`view.setZoom()`（`packages/core/src/designer/managers/view.ts`）
- 修改元素：`edit.update()` / `edit.move()` / `edit.remove()`（`packages/core/src/designer/managers/edit.ts`）

差异要点：
- ProcessOn 操作函数内部会直接触发 `Designer.painter.renderShape/renderLinker`；diagen 依赖 Solid 的响应式渲染，无需显式渲染调用。
- ProcessOn 的 `open` 同时处理外部图片与 UI 导航；diagen 需在 UI 层另行处理。

## 四、事件与历史记录

ProcessOn：
- `Designer.events.push(...)` 触发事件；`designer.events.js` 注册监听（如 `selectChanged`, `undoStackChanged`）。
- `MessageSource` 维护 `undoStack/redoStack`，并在提交时推送事件。

diagen 对应：
- `createEmitter()` 事件系统（`packages/core/src/designer/index.ts`）
- `history` manager 负责 undo/redo（`packages/core/src/designer/managers/history.ts`）
- `EditorEventType` 常量定义（`packages/core/src/constants.ts`）

## 五、选择与交互

ProcessOn：
- `Utils.selectShape()` / `Utils.unselect()` 负责选中状态
- `Utils.gridSelectObj` 支持表格网格选区
- `Utils.showAnchors()` / `Utils.showLinkerControls()` 管理交互控件

diagen 对应：
- `selection` manager（`packages/core/src/designer/managers/selection.ts`）
- 交互层渲染：`InteractionOverlay` 与 `RendererContainer`

差异要点：
- ProcessOn 有“表格网格选区”的专门结构；diagen 目前未体现对应模型与工具。

## 六、连线跨线与性能阈值

ProcessOn：
- `resetBrokenLinker` 负责跨线与交叉检测（`designer.events.js`）
- 当元素数量过多时限制跨线渲染（例如 >400）

diagen 对应：
- `DEFAULTS.LINE_JUMPS` / `DISABLE_LINE_JUMPS_THRESHOLD` 常量已存在（`packages/core/src/constants.ts`）
- 跨线的具体计算与渲染路径尚未在当前代码中看到完整实现

## 七、数据结构差异摘要（迁移提示）

可直接对齐：
- `Diagram.page` ↔ `definition.page`
- `Diagram.elements` ↔ `definition.elements`
- `Diagram.theme` ↔ `definition.theme`
- `Diagram.comments` ↔ `definition.comments`

需要转换：
- `props.zindex`（ProcessOn） → `orderList`（diagen）
- `defaultStyle/defaultLinkerStyle`（ProcessOn） → diagen 默认值体系（`DEFAULTS`/Schema）
- 形状动态函数（`getPath/getAnchors`） → diagen 的静态 `path/anchors` + utils 计算

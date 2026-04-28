# 架构总览

## 1. 分层原则
- `core` 负责文档模型、编辑语义、历史和视图计算。
- `renderer` 负责渲染与指针/键盘交互编排、预览渲染。
- `ui` 负责把 designer 能力映射为 toolbar、sidebar、context menu、actions、editor 等产品壳层。
- `playgrounds/vite` 是当前唯一正式宿主，用于联调与后续持久化接入验证。
- 当前未对外发布，因此架构演进时不以兼容旧实现为目标。

## 2. 状态边界

### 持久化文档态
- `state.diagram`
- 主要内容：
  - `elements`
  - `orderList`
  - `page`
  - `theme`
  - `createdAt / updatedAt / version / properties`

### 编辑器运行态
- `state.diagram`：持久化图表数据（文档态）
- `state.transform`
- `state.viewportSize`
- `state.worldSize`
- `state.originOffset`
- `state.config`
- `state.tool`

### 结论
- 文档态和运行时必须分离。
- DOM 几何、交互会话、hover、选框、手柄、快捷菜单都不应写入 `Diagram`。

## 3. designer 组装方式
文件：`packages/core/src/designer/create.ts`

当前 `createDesigner()` 内部组装顺序：
1. `element`
2. `history`
3. `selection`
4. `view`
5. `edit`
6. `group`
7. `clipboard`
8. `tool`

## 4. 渲染与交互主链路
文件：`packages/renderer/src/scene/Renderer.tsx`

主链路：
1. `Renderer` 初始化 `coordinate / pointer / keyboard / scrollService / rendererHover / textEditorControl`
2. 事件经 `createCoordinateService` 统一转换到 canvas 坐标
3. `createPointerInteraction` 决定当前进入哪类交互会话
4. 通过 `edit / selection / view / history / clipboard / tool` 驱动 `core`
5. `CanvasRenderer + overlays` 根据状态重绘

服务层：
- `createCoordinateService`：坐标转换
- `createScrollService`：滚动与自动滚动（原 `createAutoScroll` 已合并）
- `createRendererHover`：悬停光标检测
- `createTextEditorControl`：文本编辑控件

当前已经接上的键盘路径（来自 `@diagen/primitives` 的 `createKeyboard`）：
- `delete`
- `mod+a`
- `escape`
- `mod+z`
- `mod+y`
- `mod+shift+z`
- `mod+c`
- `mod+v`
- `mod+x`
- `mod+d`

## 5. 视觉层分层
文件：`packages/renderer/src/scene/Renderer.tsx`

- world 层：有 transform，用于页面背景和网格
- scene 层：用于元素渲染
- overlay 层：用于选框、控制点、guide line、快捷建线面板、连线控制点

渲染原语层（`packages/renderer/src/canvas/render/`）：
- `shape.ts`：`renderShape()` — shape 渲染主入口
- `linker.ts`：`renderLinker()` — linker 渲染主入口
- `primitives.ts`：`tracePath / applyFillStyle / applyLineStyle / drawText` — Canvas 绑定原语
- `layout.ts`：文本布局计算

预览系统（`packages/renderer/src/canvas/preview/`）：
- `CanvasPreview.tsx`：通用预览组件，支持 tooltip 与内联两种变体
- `ShapePreviewCanvas.tsx`：shape 预览渲染
- `LinkerPreviewCanvas.tsx`：linker 预览渲染
- `previewRoute.ts`：linker 预览路由计算
- `previewStyle.ts`：预览样式常量

设计原则：
- 计算在 `core`
- 呈现在 `renderer`
- overlay 只做反馈，不持久化语义
- 预览系统与主渲染共享同一组渲染原语

## 6. 命令与历史边界
- `edit` 写操作默认进入 `history.execute(...)`
- 连续动作通过 transaction 合并为单个 undo 单元
- `clipboard.cut / paste / duplicate` 已走事务化封装
- `edit.update` 已统一对象快照记录，避免 Solid store proxy 污染历史

## 7. 当前持久化架构判断
当前判断：
- `core` 已有持久化方向的基础实现，正式文件格式默认围绕 `Diagram`。
- 多 page 完成前，不急着锁定最终导入导出接口命名。

当前缺失：
- 宿主持久化闭环
- 脏状态与已保存版本号
- 自动保存策略
- 宿主存储适配器
- 正式导入导出动作

## 8. 默认值配置分层

三层默认值入口，通过 `resolveDiagenDefaults()` 统一解析：

```
core/schema/defaults.ts          → 模型常量（线/填充/字体样式、路径定义）
  ↓
renderer/defaults.ts             → 交互参数（拖拽阈值、吸附距离）+ 缩放范围
  ↓
ui/defaults.ts                   → toolbar 条目、contextMenu 分场景条目、sidebar 文案、图标覆盖
  ↓
resolveDiagenDefaults(overrides) → 对外唯一默认值入口
```

调用方通过 `DiagenDefaultsOverrides` 按域覆盖。Schema 层额外提供 `setDefaultLineStyle / setDefaultFillStyle / setDefaultFontStyle` 运行时注册入口。

## 9. 分页设计决策
如果后续支持多 page：

- `Diagram` 直接作为文件根模型
- `Page` 作为 `Diagram` 的子节点
- 分页语义进入 `core`
- 分页 UI 留在应用层

推荐方向：
- `Diagram.pages`
- `Diagram.pageOrder`
- `EditorState.activePageId`

不推荐方向：
- 再额外引入 `Document -> Diagram -> Page` 三层协议
- 在全局 `elements` 上通过 `pageId` 做到处过滤

## 10. 导入导出决策
- 正式导入导出默认围绕 `Diagram`
- 多 page 场景默认导入导出整份 `Diagram`
- "导出当前页"属于后续衍生功能
- 本地自动保存使用宿主快照结构（`LocalSnapshot`），不进 `core` 正式协议

---

最后更新：2026-04-28

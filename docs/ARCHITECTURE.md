# 架构总览

## 1. 分层原则
- `core` 负责文档模型、编辑语义、历史和视图计算。
- `renderer` 负责渲染与指针/键盘交互编排。
- `ui` 负责把 designer 能力映射为 toolbar、sidebar、editor 等产品壳层。
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

这说明两件事：
- 所有正式编辑都应尽量走 manager，而不是直接改 store。
- 未来持久化也应尽量挂在 designer 的 `Diagram` 文件边界上，而不是跨层直接读写 UI 状态。

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
- `createRendererHover`：悬停光标检测（新增）
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

- world 层
  - 有 transform
  - 用于页面背景和网格
- scene 层
  - 用于元素渲染
- overlay 层
  - 用于选框、控制点、guide line、快捷建线面板、连线控制点

设计原则：
- 计算在 `core`
- 呈现在 `renderer`
- overlay 只做反馈，不持久化语义

## 6. 命令与历史边界
- `edit` 写操作默认进入 `history.execute(...)`
- 连续动作通过 transaction 合并为单个 undo 单元
- `clipboard.cut / paste / duplicate` 已走事务化封装
- `edit.update` 已统一对象快照记录，避免 Solid store proxy 污染历史

对后续持久化的影响：
- 自动保存不能直接监听 DOM 或组件事件
- 应优先订阅文档变更语义，例如 manager 写操作或 history 变更后的稳定结果

## 7. 当前持久化架构判断
当前判断：
- `core` 已有持久化方向的基础实现，但不再把旧的 `Document` 方案视为长期协议。
- 正式文件格式默认围绕 `Diagram`。
- 多 page 完成前，不急着锁定最终导入导出接口命名。

当前缺失：
- 宿主持久化闭环
- 脏状态与已保存版本号
- 自动保存策略
- 宿主存储适配器
- 正式导入导出动作

当前约束：
- 不为旧文档格式保留兼容层。
- 若文件协议继续调整，直接统一修改 `core / ui / playground / tests`。
- `schemaVersion` 若保留，只服务当前正式协议的内部演进，不为历史草案兜底。
- 正式导入导出格式优先保持为 `Diagram`，而不是宿主快照或额外 `Document` 壳层。

推荐职责边界：
- `core`：`Diagram` 文件格式、解析、校验、装载
- `ui`：保存/导入/导出入口
- `playground` 或未来宿主：决定存储到 `localStorage / IndexedDB / 服务端`
- 宿主快照层：承载 `view / savedAt / activePageId` 等不属于正式交换格式的附加信息

## 8. 分页设计决策
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

原因：
- 导入导出天然围绕"一个图文件"
- 多 page 已经属于文档语义，不是单纯 UI 视图切换
- history、selection、clipboard、跨页操作都需要 `core` 统一兜底

## 9. 导入导出决策
- 正式导入：导入一份 `Diagram`
- 正式导出：导出一份 `Diagram`
- 未来若支持多 page，默认仍导入导出整份多 page `Diagram`
- "导出当前页"属于后续衍生功能，不改变正式文件根格式
- 本地自动保存可使用宿主快照结构，例如：

```ts
interface LocalSnapshot {
  diagram: Diagram
  view?: { x: number; y: number; zoom: number }
  activePageId?: string
  savedAt: number
}
```

约束：
- `LocalSnapshot` 只存在于宿主层，不进入 `core` 正式协议
- `core` 不为本地恢复需求污染正式导入导出格式

最后更新：2026-04-11
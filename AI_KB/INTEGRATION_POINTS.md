# AI 接入要点

推荐集成入口（核心 API）：
- 设计器入口：`packages/core/src/designer/index.ts`（`createDesigner`）
- 核心管理器：`element` / `edit` / `selection` / `history` / `view`
- 元素创建：`edit.create(...)`（通过 `element.create(...)` 调用 Schema 生成）
- 序列化/加载：`serialize()` 与 `loadFromJSON()`

可直接驱动的能力（适合 AI 指令落地）：
- 添加元素：`edit.add(...)` 或 `edit.create('shape' | 'linker' | 'custom', ...)`
- 更新元素：`edit.update(id, patch)`
- 删除元素：`edit.remove(id)`
- 移动元素：`edit.move(ids, dx, dy)`
- 分组/层级：`element.group(ids)`、`element.ungroup(groupId)`
- 对齐/分布：`element.align(ids, type)`、`element.distribute(ids, type)`
- 撤销/重做：`history.undo()`、`history.redo()`

事件触发点（用于行为/日志采集）：
- 元素事件由 `element` manager 触发：`element:added` / `element:removed` / `element:updated` / `element:moved` / `element:cleared`
- 事件发射位于：`packages/core/src/designer/managers/element.ts`

典型 AI 工作流建议：
- 将自然语言指令解析为“元素创建/更新/删除/布局”命令
- 批量操作时优先使用 `edit` 与 `history` 组合，以获得撤销能力
- 对外存档时使用 `serialize()`，恢复时使用 `loadFromJSON()`

渲染层接入点（UI/交互扩展）：
- `packages/renderer/src/components/RendererContainer.tsx`
- `packages/renderer/src/canvas/CanvasRenderer.tsx`
- `packages/renderer/src/components/InteractionOverlay.tsx`

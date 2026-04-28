# 开发与运行

## 0. 使用范围说明

本文件只描述**当前阶段仍有效**的开发与验证指引。持久化与导入导出等宿主工作流未闭环，对应回归项见"后续阶段回归清单"。

## 1. 基础命令
- 安装依赖：`pnpm install`
- 构建所有包：`pnpm run build:packages`
- watch：`pnpm run watch`
- 单元测试：`pnpm run test:unit`
- 启动 playground：`pnpm -C playgrounds/vite dev`

## 2. 高频入口文件
- designer 工厂：`packages/core/src/designer/create.ts`
- history：`packages/core/src/designer/managers/history.ts`
- clipboard：`packages/core/src/designer/managers/clipboard.ts`
- view manager：`packages/core/src/designer/managers/view/index.ts`
- view navigation：`packages/core/src/designer/managers/view/navigation.ts`
- tool manager：`packages/core/src/designer/managers/tool.ts`
- renderer 主入口：`packages/renderer/src/scene/Renderer.tsx`
- 指针交互：`packages/renderer/src/scene/pointer/index.ts`
- coordinate service：`packages/renderer/src/scene/services/createCoordinateService.ts`
- scroll service：`packages/renderer/src/scene/services/createScrollService.ts`
- canvas 渲染原语：`packages/renderer/src/canvas/render/`
- canvas 预览系统：`packages/renderer/src/canvas/preview/`
- renderer 默认值：`packages/renderer/src/defaults.ts`
- actions：`packages/ui/src/actions/createActions.ts`
- UI 默认值：`packages/ui/src/defaults.ts`
- toolbar bridge：`packages/ui/src/toolbar/createToolbarBridge.ts`
- context menu bridge：`packages/ui/src/editor/contextMenu/createContextMenuBridge.ts`
- sidebar bridge：`packages/ui/src/sidebar/createSidebarBridge.tsx`
- sidebar shape library：`packages/ui/src/sidebar/createShapeLibraryBridge.tsx`
- playground：`playgrounds/vite/src/App.tsx`

## 3. 定向测试建议

### 改动 `core` 数据模型、history、manager 语义时
- `packages/core/src/designer/managers/history.test.ts`
- `packages/core/src/designer/managers/edit/index.test.ts`
- `packages/core/src/designer/managers/clipboard.test.ts`
- `packages/core/src/designer/managers/selection.test.ts`
- `packages/core/src/designer/managers/group.test.ts`
- `packages/core/src/designer/managers/view/index.test.ts`

### 改动 renderer 交互时
- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/renderer/src/scene/pointer/machine.test.ts`
- `packages/renderer/src/scene/services/createScrollService.test.ts`
- `packages/renderer/src/scene/services/createCoordinateService.test.ts`

### 改动路由与变换时
- `packages/core/src/transform/index.test.ts`
- `packages/core/src/route/route.test.ts`

### 改动预览系统时
- `packages/renderer/src/canvas/preview/previewRoute.test.ts`

### 改动 UI 桥接层时
- `packages/ui/src/sidebar/createShapeLibraryBridge.test.tsx`
- `packages/ui/src/editor/contextMenu/ContextMenu.test.tsx`

## 4. 当前测试覆盖判断（可执行口径）

`packages/renderer/src/scene/Renderer.test.ts` 已覆盖：
- box select
- scroll 后框选
- auto-scroll
- auto-grow 补偿
- zoom 下拖拽 / resize / rotate
- move / resize guide line
- create-linker
- quick-create linker
- linker endpoint 编辑
- clipboard 键盘快捷键
- delete / select all / escape
- context menu 上下文识别
- 文本编辑（shape 与 linker）
- linker 标签拖拽与 textPosition

容器与层级语义已完成的回归：
- 容器收纳 / 脱离 / 跨容器移动的组合语义测试
- 容器与 selection / history / clipboard 的一致性回归

当前阶段重点缺口：
- `actual size` 动作测试
- Space + drag 与中键平移一致性回归
- 默认样式编辑与新建元素继承的正式回归
- 批量样式应用与 history 粒度回归

## 5. 开发注意事项

### 关于 `edit.update`
- 历史 entry 只能记录 plain snapshot。
- 不要把 Solid proxy、draft 或共享对象引用写入 history。
- 整对象、nested setter、produce 更新都要回归 undo/redo。

### 关于默认值配置
- 三层默认值入口：`core/schema/defaults.ts`（模型常量）→ `renderer/defaults.ts`（交互参数）→ `ui/defaults.ts`（toolbar / contextMenu / sidebar、`resolveDiagenDefaults`）
- 调用方通过 `DiagenDefaultsOverrides` 按域覆盖，不要直接修改默认值常量

### 关于右键菜单
- 默认菜单项按 targetType 分四组：`canvas / element / linker / selection`
- 入口：`getContextMenuDefaultEntries(targetType, defaults)` 在 `packages/ui/src/defaults.ts`
- 自定义菜单通过 `entries` 参数传入 `createContextMenuBridge` 或通过 `DiagenDefaultsOverrides.ui.contextMenu.entries` 覆盖

## 6. 当前阶段手工回归清单（样式体系与导航效率）

1. 新建 shape / linker 时能继承当前默认样式。
2. 对多选元素批量应用样式后，只产生一个 undo 单元。
3. `fit to content / fit to selection / zoom in / zoom out` 行为一致且可预测。
4. `actual size` 将 zoom 复位到 1。
5. space 平移与中键平移共享同一套 view 结果。
6. 滚轮缩放不会破坏现有拖拽、建线与文本编辑主链路。
7. undo / redo 后样式字段与视图状态保持一致。

## 7. 后续阶段回归清单（文档链路/宿主工作流）

以下能力目前未闭环，不作为当前阶段默认验收项：

1. 页面刷新后文档能恢复。
2. 导入合法 JSON 后，画布、选择和历史状态符合预期。
3. 导入非法 JSON 时，有明确错误反馈且不会破坏当前文档。
4. 拖拽、旋转、建线后自动保存不会造成卡顿。
5. 导出 JSON 后再次导入，元素数量、顺序、page 设置保持一致。

## 8. renderer 测试文件完整列表

### scene/ 目录
```
packages/renderer/src/scene/Renderer.test.ts
packages/renderer/src/scene/pointer/machine.test.ts
packages/renderer/src/scene/pointer/shared/createDragSession.test.ts
packages/renderer/src/scene/pointer/shared/createPointerDeltaState.test.ts
packages/renderer/src/scene/pointer/shared/createPointerDragTracker.test.ts
packages/renderer/src/scene/pointer/shape/createResize.test.ts
packages/renderer/src/scene/pointer/shape/createShapeDrag.test.ts
packages/renderer/src/scene/pointer/shape/createRotate.test.ts
packages/renderer/src/scene/pointer/viewport/createBoxSelection.test.ts
packages/renderer/src/scene/pointer/viewport/createPan.test.ts
packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts
packages/renderer/src/scene/linker/normalizeManualPoints.test.ts
packages/renderer/src/scene/overlays/LinkerOverlay/index.test.ts
packages/renderer/src/scene/services/createCoordinateService.test.ts
packages/renderer/src/scene/services/createScrollService.test.ts
```

### canvas/ 目录
```
packages/renderer/src/canvas/preview/previewRoute.test.ts
packages/renderer/src/canvas/render/index.test.ts
packages/renderer/src/canvas/render/layout.test.ts
```

### utils/ 目录
```
packages/renderer/src/utils/hitTest/index.test.ts
packages/renderer/src/utils/hitTest/linkerHitTest.test.ts
```

### core/designer/ 目录
```
packages/core/src/designer/managers/clipboard.test.ts
packages/core/src/designer/managers/edit/index.test.ts
packages/core/src/designer/managers/element/index.test.ts
packages/core/src/designer/managers/group.test.ts
packages/core/src/designer/managers/history.test.ts
packages/core/src/designer/managers/selection.test.ts
packages/core/src/designer/managers/tool.test.ts
packages/core/src/designer/managers/view/index.test.ts
packages/core/src/designer/managers/view/shared.test.ts
```

---

最后更新：2026-04-28

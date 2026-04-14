# 开发与运行

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
- renderer 主入口：`packages/renderer/src/scene/Renderer.tsx`
- 指针交互：`packages/renderer/src/scene/pointer/index.ts`
- coordinate service：`packages/renderer/src/scene/services/createCoordinateService.ts`
- scroll service：`packages/renderer/src/scene/services/createScrollService.ts`
- toolbar bridge：`packages/ui/src/toolbar/createToolbarBridge.ts`
- playground：`playgrounds/vite/src/App.tsx`

## 3. 定向测试建议

### 改动 `core` 数据模型、history、持久化时
- `packages/core/src/designer/managers/history.test.ts`
- `packages/core/src/designer/managers/edit/index.test.ts`
- `packages/core/src/designer/managers/clipboard.test.ts`

### 改动 renderer 交互时
- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/renderer/src/scene/pointer/machine.test.ts`
- `packages/renderer/src/scene/services/createScrollService.test.ts`

### 改动路由与变换时
- `packages/core/src/transform/index.test.ts`
- `packages/core/src/route/route.test.ts`

## 4. 当前测试覆盖判断
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

缺口主要转移到文档链路：
- 序列化/反序列化协议测试
- 导入异常测试
- 自动保存去抖测试

## 5. 开发注意事项

### 关于 `edit.update`
- 历史 entry 只能记录 plain snapshot。
- 不要把 Solid proxy、draft 或共享对象引用写入 history。
- 整对象、nested setter、produce 更新都要回归 undo/redo。

### 关于持久化
- 只持久化正式 `Diagram` 文件语义，不要持久化 `tool / originOffset / viewportSize` 等运行时字段。
- 自动保存应监听稳定的文档变更，不要直接监听组件层事件。
- 导入要经过统一校验与装载，不要在 UI 层直接 `JSON.parse + setState`。
- 当前阶段不需要为了兼容旧格式保留双轨逻辑；协议变更时同步修改测试与宿主接线。

## 6. 手工回归清单
1. 页面刷新后文档能恢复。
2. 导入合法 JSON 后，画布、选择和历史状态符合预期。
3. 导入非法 JSON 时，有明确错误反馈且不会破坏当前文档。
4. 拖拽、旋转、建线后自动保存不会造成卡顿。
5. 导出 JSON 后再次导入，元素数量、顺序、page 设置保持一致。

## 7. renderer 测试文件完整列表

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

最后更新：2026-04-11
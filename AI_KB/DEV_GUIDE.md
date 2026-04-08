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
- renderer 主入口：`packages/renderer/src/components/Renderer/index.tsx`
- 指针交互：`packages/renderer/src/components/Renderer/interaction/createPointerInteraction`
- toolbar bridge：`packages/ui/src/toolbar/createToolbarBridge.ts`
- playground：`playgrounds/vite/src/App.tsx`

## 3. 定向测试建议

### 改动 `core` 数据模型、history、持久化时
- `packages/core/src/designer/__tests__/historyManager.test.ts`
- `packages/core/src/designer/managers/edit/__tests__/index.test.ts`
- `packages/core/src/designer/__tests__/clipboardManager.test.ts`

### 改动 renderer 交互时
- `packages/renderer/src/components/Renderer/index.test.ts`
- `packages/renderer/src/components/Renderer/interaction/createPointerInteraction/index.test.ts`
- `packages/renderer/src/components/Renderer/primitives/createAutoScroll.test.ts`

### 改动路由与变换时
- `packages/core/src/utils/__tests__/transform.test.ts`
- `packages/core/src/utils/router/__tests__/router.test.ts`

## 4. 当前测试覆盖判断
`packages/renderer/src/components/Renderer/index.test.ts` 已覆盖：
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

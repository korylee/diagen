# 仓库结构速览

## 1. 根目录
- `AI_KB/`：当前知识库
- `packages/`：各业务包
- `playgrounds/vite/`：当前唯一正式联调入口
- `.processon/`：历史参考资料
- `turbo.json`、`vitest.config.ts`、`tsdown.config.ts`：构建与测试配置

## 2. 核心包

### `packages/core`
- `src/model/`
  - `diagram.ts`
  - `page.ts`
  - `shape.ts`
  - `linker.ts`
  - `types.ts`
- `src/designer/`
  - `create.ts`
  - `types.ts`
  - `managers/`
- `src/schema/`
- `src/utils/`

### `packages/renderer`
- `src/components/Renderer/index.tsx`
  - 当前真实的交互主入口
- `src/components/InteractionOverlay/`
  - 选择框、guide、shape 选中态、linker 控件
- `src/components/Renderer/interaction/createPointerInteraction/`
  - 指针交互状态机与各类交互实现
- `src/components/Renderer/primitives/`
  - `createCoordinateService`
  - `createAutoScroll`
- `src/.test/createRendererTestHarness.ts`
  - renderer 集成测试夹具

### `packages/ui`
- `src/editor/Editor.tsx`
- `src/toolbar/createToolbarBridge.ts`
- `src/sidebar/createSidebarBridge.tsx`
- `src/actions/createActions.ts`

## 3. 关键文件索引
- designer 工厂：`packages/core/src/designer/create.ts`
- history：`packages/core/src/designer/managers/history.ts`
- clipboard：`packages/core/src/designer/managers/clipboard.ts`
- group：`packages/core/src/designer/managers/group.ts`
- renderer：`packages/renderer/src/components/Renderer/index.tsx`
- pointer interaction：`packages/renderer/src/components/Renderer/interaction/createPointerInteraction/index.ts`
- renderer 集成测试：`packages/renderer/src/components/Renderer/index.test.ts`
- playground 入口：`playgrounds/vite/src/App.tsx`

## 4. 当前与旧文档的差异提醒
- 当前交互入口是 `Renderer/index.tsx`，不是旧文档中的 `RendererContainer.tsx`
- 坐标服务位于 `packages/renderer/src/components/Renderer/primitives/createCoordinateService.ts`
- 快捷建线能力已并入 `InteractionOverlay + createPointerInteraction`，不再是独立老路径

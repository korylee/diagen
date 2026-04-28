# 仓库结构速览

## 1. 根目录
- `docs/`：当前知识库
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
    - `element/`
    - `edit/`
    - `selection.ts`
    - `history.ts`
    - `group.ts`
    - `clipboard.ts`
    - `tool.ts`
    - `view/`（`index.ts`、`navigation.ts`、`bounds.ts`、`autoGrow.ts`、`linkerLayout.ts`）
- `src/schema/`
  - `Schema.ts`
  - `defaults.ts`（默认样式常量与基础 shape 路径定义）
  - `basic.ts`
  - `types.ts`
- `src/transform/`：变换计算
- `src/route/`：路由计算
- `src/expression/`：表达式编译与求值
- `src/constants.ts`：枚举常量与 DEFAULTS

### `packages/renderer`
- `src/scene/Renderer.tsx`：渲染与交互主入口
- `src/scene/`
  - `Renderer.test.ts`：集成测试
  - `Renderer.scss`
  - `controls/textEditor/`：文本编辑控件
  - `events/`：事件处理
  - `linker/`：连线相关工具
  - `overlays/`：覆盖层组件（框选、guide、选中态、连线控件）
  - `pointer/`：指针交互状态机与各类交互实现
  - `services/`：coordinate、scroll 等服务层
- `src/canvas/`
  - `CanvasRenderer.tsx`：Canvas 渲染组件
  - `element/`：ShapeCanvas、LinkerCanvas
  - `render/`：渲染原语（`shape.ts`、`linker.ts`、`primitives.ts`、`layout.ts`）
  - `preview/`：预览系统（`CanvasPreview.tsx`、`ShapePreviewCanvas.tsx`、`LinkerPreviewCanvas.tsx`、`previewRoute.ts`、`previewStyle.ts`）
- `src/context/`：Context providers
- `src/defaults.ts`：renderer 默认值（interaction + zoom）
- `src/.test/createRendererTestHarness.ts`：renderer 集成测试夹具

### `packages/ui`
- `src/editor/Editor.tsx`
- `src/editor/contextMenu/`：右键菜单组件、bridge、类型定义
- `src/toolbar/`：toolbar 组件与 bridge
- `src/sidebar/`：sidebar 组件、bridge、shape library bridge、搜索、创建模式、CanvasPreview 接入
- `src/actions/createActions.ts`：UI 动作注册
- `src/defaults.ts`：UI 默认值（toolbar / contextMenu / sidebar / iconRegistry）与 `resolveDiagenDefaults`
- `src/config/`：ConfigProvider、DesignerProvider
- `src/preview/`：TooltipCanvasPreview
- `src/iconRegistry/`：图标注册与渲染

## 3. 关键文件索引
- designer 工厂：`packages/core/src/designer/create.ts`
- history：`packages/core/src/designer/managers/history.ts`
- clipboard：`packages/core/src/designer/managers/clipboard.ts`
- group：`packages/core/src/designer/managers/group.ts`
- tool：`packages/core/src/designer/managers/tool.ts`
- view manager：`packages/core/src/designer/managers/view/index.ts`
- view navigation：`packages/core/src/designer/managers/view/navigation.ts`
- Schema：`packages/core/src/schema/Schema.ts`
- Schema defaults：`packages/core/src/schema/defaults.ts`
- renderer：`packages/renderer/src/scene/Renderer.tsx`
- pointer interaction：`packages/renderer/src/scene/pointer/index.ts`
- coordinate service：`packages/renderer/src/scene/services/createCoordinateService.ts`
- scroll service：`packages/renderer/src/scene/services/createScrollService.ts`
- canvas 渲染原语：`packages/renderer/src/canvas/render/`
- canvas 预览：`packages/renderer/src/canvas/preview/CanvasPreview.tsx`
- renderer 默认值：`packages/renderer/src/defaults.ts`
- actions：`packages/ui/src/actions/createActions.ts`
- UI 默认值：`packages/ui/src/defaults.ts`
- toolbar bridge：`packages/ui/src/toolbar/createToolbarBridge.ts`
- context menu bridge：`packages/ui/src/editor/contextMenu/createContextMenuBridge.ts`
- sidebar bridge：`packages/ui/src/sidebar/createSidebarBridge.tsx`
- renderer 集成测试：`packages/renderer/src/scene/Renderer.test.ts`
- playground 入口：`playgrounds/vite/src/App.tsx`

## 4. 路径变更提醒

以下为近期重构变更，旧路径已失效：

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `components/Renderer/index.tsx` | `scene/Renderer.tsx` | 渲染主入口 |
| `components/Renderer/index.test.ts` | `scene/Renderer.test.ts` | 集成测试 |
| `components/InteractionOverlay/` | `scene/overlays/` | 覆盖层 |
| `components/Renderer/interaction/createPointerInteraction/` | `scene/pointer/` | 指针交互 |
| `components/Renderer/primitives/createCoordinateService.ts` | `scene/services/createCoordinateService.ts` | 坐标服务 |
| `components/Renderer/primitives/createAutoScroll.ts` | `scene/services/createScrollService.ts` | 滚动服务 |
| `utils/transform` | `transform/` | 变换计算 |
| `utils/router` | `route/` | 路由计算 |
| `utils/path-cache/` | （已删除） | 死代码，无调用方 |

---

最后更新：2026-04-28

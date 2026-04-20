# 仓库结构速览

## 1. 根目录
- `docs/`：当前知识库
  - `LINKER_ENDPOINT_REFACTOR.md`：`LinkerEndpoint` 重构方案与阶段性执行口径
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
- `src/transform/`：变换计算（原 utils/transform）
- `src/route/`：路由计算（原 utils/router）

### `packages/renderer`
- `src/scene/Renderer.tsx`：当前渲染与交互主入口
- `src/scene/`
  - `Renderer.test.ts`：集成测试
  - `Renderer.scss`
  - `controls/textEditor/`：文本编辑控件
  - `events/`：事件处理（已内联部分逻辑）
  - `linker/`：连线相关工具
  - `overlays/`：覆盖层组件（框选、guide、选中态、连线控件）
  - `pointer/`：指针交互状态机与各类交互实现
  - `services/`：服务层
- `src/canvas/`：Canvas 渲染器
- `src/context/`：Context providers
- `src/.test/createRendererTestHarness.ts`：renderer 集成测试夹具

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
- renderer：`packages/renderer/src/scene/Renderer.tsx`
- pointer interaction：`packages/renderer/src/scene/pointer/index.ts`
- coordinate service：`packages/renderer/src/scene/services/createCoordinateService.ts`
- scroll service：`packages/renderer/src/scene/services/createScrollService.ts`
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
| `components/Renderer/primitives/createAutoScroll.ts` | `scene/services/createScrollService.ts` | 滚动服务（改名） |
| `utils/transform` | `transform/` | 变换计算（独立目录） |
| `utils/router` | `route/` | 路由计算（独立目录） |

最后更新：2026-04-11

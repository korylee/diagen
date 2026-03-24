# 项目概览

## 1. 项目定位
- Diagen 是一个基于 SolidJS 的在线图形编辑器（流程图/通用图表）。
- 仓库保留 `.processon/` 参考代码，用于机制对照与能力追平。
- 架构目标：保持核心状态可维护、交互链路可扩展，而不是继续堆叠单体逻辑。

## 2. 技术与工程形态
- 语言：TypeScript（strict）
- UI：SolidJS
- 构建：Turbo + tsdown
- 调试：Vite playground（`playgrounds/vite`）
- 测试：Vitest
- 仓库：pnpm workspace monorepo

## 3. 包级职责
- `@diagen/core`
  - 领域模型（Diagram/Shape/Linker/Page）
  - Designer 状态与 manager（element/edit/selection/history/view）
  - 坐标/几何/路由等核心算法
- `@diagen/renderer`
  - Solid 组件与画布渲染
  - 交互编排（pointer machine）与 overlay 控件
- `@diagen/primitives`
  - 浏览器能力封装（事件监听、滚动、DPR、元素尺寸）
- `@diagen/shared`
  - 数学、对象工具、事件器、通用类型
- `@diagen/icons`
  - 纯 SVG 图标资产包
  - 不依赖 `Designer` 语义，不承载 Sidebar preview 或 palette 注册逻辑
- `@diagen/ui`
  - 编辑器壳层 UI 组件（Sidebar / Topbar / TopMenu / ContextMenu）
  - 当前已落地结构化 `Sidebar` 与 `Toolbar`，定位为可扩展的壳层面板/工具栏组件
- `@diagen/designer-ui`
  - 编辑器壳层 bridge 层，负责将 `Designer` 命令/状态映射为 UI 可消费模型
  - 同时承载业务侧 preview 组装，例如 Sidebar item 注册时的 canvas preview

## 4. 当前架构关键事实（2026-03-24）
- 渲染容器采用三层契约：
  - `world-layer`：带 transform，用于世界层内容
  - `scene-layer`：不做 transform，承载元素屏幕坐标渲染
  - `overlay-layer`：不做 transform，承载选框/手柄/锚点等交互覆盖
- 事件坐标归一化入口：
  - `packages/renderer/src/primitives/createCoordinateService.ts`
  - 对外提供 `eventToCanvas / eventToScreen / canvasToScreen / screenToCanvas`
- `core` 坐标变换保持可逆：
  - `packages/core/src/utils/transform.ts`
- `view` 已成为连线路由主链路入口：
  - `packages/core/src/designer/managers/view.ts`
  - 默认 `broken/orthogonal` -> `obstacle + hybrid`
  - 默认 `straight/curved` -> `basic`
- `tool manager` 已进入 `core` 运行时：
  - `packages/core/src/designer/managers/tool.ts`
  - 当前支持 `idle / create-shape / create-linker`
- 正式创建链路已接入 renderer：
  - `packages/renderer/src/components/RendererContainer.tsx`
  - `create-shape` 下点击空白画布即可创建 shape
  - `create-linker` 下支持从空白点开始创建 linker
  - `packages/renderer/src/canvas/CanvasRenderer.tsx`
  - `create-linker` 下点按 shape 可直接进入快速建线
- `@diagen/ui` 已建立独立构建与导出：
  - `packages/ui/package.json`
  - `packages/ui/src/components/sidebar.tsx`
  - `packages/ui/src/components/sidebar.types.ts`
  - `packages/ui/src/components/sidebar.styles.ts`
  - `packages/ui/src/components/Toolbar/index.tsx`
  - 当前 Sidebar 支持 `sections / activeItemId / header / footer / search / onItemSelect / onSectionToggle`
  - Section 具备 `grid/list` 双布局，可同时承载图元 palette 与动作列表
  - Toolbar 采用复合组件 API，可表达 `button / link / spinner / divider / spacer / right`
- `@diagen/designer-ui` 已建立最小 bridge 结构：
  - `packages/designer-ui/package.json`
  - `packages/designer-ui/src/designerIconRegistry.tsx`
  - `packages/designer-ui/src/toolbar/createToolbarBridge.ts`
  - `packages/designer-ui/src/toolbar/DesignerToolbar.tsx`
  - `packages/designer-ui/src/sidebar/createSidebarBridge.tsx`
  - `packages/designer-ui/src/sidebar/createShapeLibraryBridge.tsx`
  - `packages/designer-ui/src/sidebar/createSidebarActionBridge.tsx`
  - `packages/designer-ui/src/sidebar/DesignerSidebar.tsx`
  - `packages/designer-ui/src/sidebar/SidebarCanvasPreview.tsx`
  - `designerIconRegistry.tsx` 当前只负责“语义键 -> icon 资产组件”映射
  - Sidebar preview 已改为在 `createSidebarBridge.tsx` 注册 item 时创建，不再由 `@diagen/icons` 提供
  - 当前 `createToolbarBridge` 仅桥接已稳定命令：工具切换、撤销重做、分组解组、删除、缩放/适配
  - 当前 Sidebar bridge 已拆为 shape library 与 action 两条子桥：palette、快捷创建、分组删除、历史与视图动作分别组装
  - `DesignerToolbar` 已可直接消费 `Designer` 并渲染 `@diagen/ui/Toolbar`
  - `DesignerSidebar` 已可直接消费 `Designer` 并渲染 `@diagen/ui/Sidebar`，内建搜索过滤，但仍保留 header/footer 等宿主插槽
- `@diagen/icons` 已采用生成式资产管线：
  - `packages/icons/assets/*.svg`
  - `packages/icons/scripts/build-icons.mjs`
  - `packages/icons/src/generated/*`
  - 当前脚本使用 `svgo` 规范化 SVG，并仅支持平铺 assets 目录
- `lineJumps` 已进入主渲染链：
  - 数据开关：`packages/core/src/model/page.ts`
  - 几何计算：`packages/core/src/utils/router/lineJumps.ts`
  - 渲染入口：`packages/renderer/src/utils/render-utils.ts`

## 5. 当前能力状态（对照 `.processon`）
- 已具备：
  - 选择、拖拽、缩放、旋转、框选、连线端点拖拽、分组、对齐/分布、撤销重做、自动扩容
  - 连线路由主链路配置与最小跳线渲染闭环
- 主要差距：
  - move/resize 吸附线体系
  - 完整剪贴板语义（copy/cut/paste/duplicate + group/linker 保真）
  - 从选中框右上角锚点拖出新线的专用 overlay 入口
  - 导入导出等产品能力

补充原则：
- 评论/批注属于应用层能力，不进入基础架构 `Diagram` 根模型。
- `packages/ui` 负责应用壳层与菜单/面板类组件，不承载图语义、交互状态机或绘制算法。
- playground 对 Toolbar/Sidebar 的 `Designer` 接线已迁移到 `designer-ui`，宿主层只保留数据加载、状态展示和布局组织。
- `.processon` 中 `shape_panel` 的“搜索 + 分类折叠 + 图元栅格”组织方式适合作为 `Sidebar` 的结构参考，但不照搬其 jQuery/DOM 耦合实现。
- Sidebar 当前重点是 API 与内部结构清晰，便于后续增加 My Shapes、hover preview、拖出创建、面板宽度调整等能力。
- `designer-ui` 是推荐的壳层桥接位置：优先依赖 `core`，仅在必须时少量消费 `renderer` 的屏幕空间信息，不直接承载绘制逻辑。
- 推荐边界：
  - `icons` 只做 SVG icon 资产
  - `ui` 只做纯组件
  - `designer-ui` 承担 `Designer -> UI props/model` 的映射，以及业务侧 preview 装配
  - `renderer` 只处理画布与覆盖层，不回卷到壳层菜单/面板编排

## 6. 运行入口
- Playground：`playgrounds/vite`
- 核心 API：`packages/core/src/designer/index.ts`（`createDesigner`）

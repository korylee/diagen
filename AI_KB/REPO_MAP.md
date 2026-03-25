# 仓库结构速览

## 1. 根目录
- `.processon/`：ProcessOn 参考实现（重点对照对象）
- `AI_KB/`：知识库文档
- `packages/`：monorepo 业务包
- `playgrounds/`：本地调试入口
- `package.json` / `pnpm-workspace.yaml`：workspace 与脚本
- `turbo.json`：构建任务编排
- `vitest.config.ts`：测试配置

## 2. packages 分布
- `packages/core/`
  - `src/model/`：Diagram/Shape/Linker/Page 模型
  - `src/designer/`：Designer 与 managers（element/edit/selection/history/view/tool）
  - `src/schema/`：默认图形与 schema 注册
  - `src/utils/`：坐标、路由、表达式、锚点等工具
  - `src/utils/transform.ts`：画布/屏幕坐标转换核心
- `packages/renderer/`
  - `src/components/RendererContainer.tsx`：交互入口与三层容器（world/scene/overlay）
  - `src/components/InteractionOverlay.tsx`：选框、手柄、锚点、连线控件
  - `src/canvas/CanvasRenderer.tsx`：形状与连线渲染入口
  - `src/primitives/`：drag/pan/resize/selection/linkerDrag 等交互原语
  - `src/primitives/createCoordinateService.ts`：事件与坐标归一化入口
- `packages/primitives/`
  - 通用浏览器交互工具（scroll、event listener、debounce 等）
- `packages/shared/`
  - 数学与基础类型（Point/Bounds/Size 等）
- `packages/icons/`
  - 纯 SVG 图标资产包
  - `assets/`：原始 SVG 资产（当前仅支持平铺目录）
  - `scripts/build-icons.mjs`：`svgo + generated component` 生成脚本
  - `src/base.tsx`：`IconBase` 基础封装
  - `src/generated/`：自动生成的 icon 组件导出
- `packages/ui/`
  - 高复用 UI 基础构件包
  - 当前已落地：
    - `src/components/panel/index.tsx`：通用 panel 构件，含 frame/header/body/footer/search/section/rail
    - `src/components/panel/types.ts`：panel 数据模型与 props
    - `src/components/panel/index.css`：统一 `--dg-panel-*` 样式变量与基础样式
    - `src/components/actionBar/index.tsx`：通用 action bar 构件，含 bar/button/link/field/divider/spacer
    - `src/components/actionBar/types.ts`：action bar props 定义
    - `src/components/actionBar/index.css`：统一 `--dg-action-bar-*` 样式变量与基础样式
  - 当前定位是“纯基础构件层”，不再以内建 `Sidebar / Toolbar` 成品语义作为主入口
- `packages/designer-ui/`
  - 编辑器壳层 bridge 包，连接 `@diagen/core` 与 `@diagen/ui`
  - 当前已落地：
    - `src/designerIconRegistry.tsx`：设计器语义键到 `@diagen/icons` 资产组件的映射层
    - `src/toolbar/createToolbarBridge.ts`：将 `Designer` 映射为 Toolbar bridge items
    - `src/toolbar/Toolbar.tsx`：组合 `@diagen/ui/actionBar` 渲染 bridge
    - `src/toolbar/types.ts`：Toolbar bridge 类型定义
    - `src/sidebar/createSidebarBridge.tsx`：聚合 Shape Library / Action 两类 sidebar bridge
    - `src/sidebar/createShapeLibraryBridge.tsx`：将 shape palette 与工具态映射为 Sidebar stencil sections
    - `src/sidebar/createSidebarActionBridge.tsx`：将分组、历史、视图动作映射为 Sidebar action sections
    - `src/sidebar/Sidebar.tsx`：组合 `@diagen/ui/panel` 基础构件渲染设计器侧 Sidebar
    - `src/sidebar/sidebar.css`：设计器侧 Sidebar 专用布局样式
    - `src/sidebar/search.ts`：设计器侧搜索过滤、搜索结果 section、分类生成
    - `src/sidebar/SidebarCanvasPreview.tsx`：Sidebar 本地 canvas preview，preview 在注册 item 时创建
    - `src/sidebar/types.ts`：Sidebar bridge 类型定义

## 3. playgrounds
- `playgrounds/vite/`：Vite 开发入口，联调 core + renderer
  - 已接入 `@diagen/designer-ui` 的 `Toolbar` / `Sidebar`
  - 宿主层仅保留样例数据、布局与状态插槽，并在 `vite.config.ts` 中加入源码 alias

## 4. 重点对照文件（`.processon`）
- `designer.core.js`：核心模型、交互、绘制、历史、剪贴板
- `designer.events.js`：事件订阅与 UI 联动
- `designer.methods.js`：对齐/分布/分组等高层操作
- `designer.ui.js`：菜单、导出、评论、历史视图等产品层

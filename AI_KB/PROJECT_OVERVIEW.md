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
- `@diagen/ui`
  - UI 组件包（当前占位）

## 4. 当前架构关键事实（2026-03-19）
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
  - 创建工具态（shape/linker 正式创建链路）
  - 导入导出等产品能力

补充原则：
- 评论/批注属于应用层能力，不进入基础架构 `Diagram` 根模型。

## 6. 运行入口
- Playground：`playgrounds/vite`
- 核心 API：`packages/core/src/designer/index.ts`（`createDesigner`）

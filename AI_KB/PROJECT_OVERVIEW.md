# 项目概览

## 1. 项目定位
- Diagen 是一个基于 SolidJS 的在线图形编辑器（流程图/通用图表）。
- 仓库同时保留了 `.processon/` 参考代码，并吸收 draw.io/mxGraph 的视图与交互分层思想。
- 当前建设重点不是“功能堆叠”，而是“坐标正确性 + 交互一致性 + 可扩展架构”。

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
  - 交互接线与 UI 覆盖层
- `@diagen/primitives`
  - 事件监听、滚动、节流、防抖等浏览器能力封装
- `@diagen/shared`
  - 基础数学、对象工具、事件器、通用类型
- `@diagen/ui`
  - UI 组件包（当前占位）

## 4. 当前架构关键事实（与 2026-03-11 代码一致）
- 渲染容器已采用三层契约：
  - `world-layer`：带 viewport transform（`translate + scale`）
  - `scene-layer`：不做 transform，承载元素屏幕坐标渲染
  - `overlay-layer`：不做 transform，承载选框/手柄等交互覆盖
- 事件坐标归一化入口统一为：
  - `packages/renderer/src/utils/pointer.ts` 的 `eventToCanvasPoint`
- `Interaction` 上下文对外暴露的是能力函数 `eventToCanvas`，不再暴露 viewport DOM。
- `core` 坐标变换中 `screenToCanvas(Bounds)` 已修复 `w/h` 反变换。

## 5. 运行入口
- Playground 入口：`playgrounds/vite`
- 核心 API 入口：`packages/core/src/designer/index.ts`（`createDesigner`）

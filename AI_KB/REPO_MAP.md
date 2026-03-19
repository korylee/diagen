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
- `packages/ui/`
  - UI 包（当前占位）

## 3. playgrounds
- `playgrounds/vite/`：Vite 开发入口，联调 core + renderer

## 4. 重点对照文件（`.processon`）
- `designer.core.js`：核心模型、交互、绘制、历史、剪贴板
- `designer.events.js`：事件订阅与 UI 联动
- `designer.methods.js`：对齐/分布/分组等高层操作
- `designer.ui.js`：菜单、导出、评论、历史视图等产品层

# 仓库结构速览

## 1. 根目录
- `.processon/`：ProcessOn 参考代码（对照学习）
- `AI_KB/`：本知识库文档
- `packages/`：monorepo 业务包
- `playgrounds/`：本地调试入口
- `package.json` / `pnpm-workspace.yaml`：workspace 与脚本
- `turbo.json`：构建任务编排
- `vitest.config.ts`：测试总配置

## 2. packages 分布
- `packages/core/`
  - `src/model/`：Diagram/Shape/Linker/Page 模型
  - `src/designer/`：Designer 与 managers（element/edit/selection/history/view）
  - `src/schema/`：默认形状与 schema
  - `src/utils/`：坐标、路由、表达式、锚点等工具
  - `src/utils/transform.ts`：画布/屏幕坐标转换核心
  - `src/utils/__tests__/transform.test.ts`：坐标变换回归测试
- `packages/renderer/`
  - `src/components/RendererContainer.tsx`：交互入口与三层容器（world/scene/overlay）
  - `src/components/InteractionOverlay.tsx`：选框、手柄、锚点、连线预览
  - `src/components/InteractionProvider.tsx`：交互能力上下文（含 `eventToCanvas`）
  - `src/canvas/CanvasRenderer.tsx`：形状与连线渲染入口
  - `src/canvas/element/`：单元素 Canvas 渲染
  - `src/primitives/`：drag/pan/resize/selection 等交互原语
  - `src/utils/pointer.ts`：事件坐标归一化（`eventToCanvasPoint`）
- `packages/primitives/`
  - 通用浏览器交互工具（scroll、event listener、debounce 等）
- `packages/shared/`
  - 数学与基础类型（Point/Bounds/Size 等）
- `packages/ui/`
  - UI 包（当前占位）

## 3. playgrounds
- `playgrounds/vite/`：Vite 开发入口，联调 core + renderer

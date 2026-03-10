# 开发与运行

## 1. 基础命令
- 安装依赖：`pnpm install`
- 构建所有包：`pnpm run build:packages`
- watch 构建：`pnpm run watch`
- 单元测试：`pnpm run test:unit`

## 2. 本地调试
- `pnpm --filter playground-vite dev`
- 或 `pnpm -C playgrounds/vite dev`

## 3. 坐标与交互相关的定向验证

建议在改动以下文件后执行：
- `packages/core/src/utils/transform.ts`
- `packages/renderer/src/utils/pointer.ts`
- `packages/renderer/src/components/RendererContainer.tsx`
- `packages/renderer/src/components/InteractionOverlay.tsx`
- `packages/renderer/src/canvas/CanvasRenderer.tsx`

定向测试命令：
- `pnpm exec vitest run --project unit packages/core/src/utils/__tests__/transform.test.ts`

手工回归清单（playground）：
1. `Ctrl + 滚轮` 缩放后，缩放中心点不跳变。
2. 框选矩形与选中结果一致（含滚动容器场景）。
3. 单选后 resize 手柄命中准确（不同 zoom）。
4. 拖拽到视口边缘时自动滚动连续。
5. 选框/手柄始终在 overlay 层，尺寸表现稳定。

## 4. 构建说明
- Turbo 任务配置：`turbo.json`
- 产物输出：各包 `dist/`
- `@diagen/core`、`@diagen/shared`、`@diagen/primitives` 使用 `tsdown`

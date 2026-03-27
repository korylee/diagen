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
- `packages/renderer/src/primitives/createCoordinateService.ts`
- `packages/renderer/src/components/RendererContainer.tsx`
- `packages/renderer/src/components/InteractionOverlay.tsx`
- `packages/renderer/src/canvas/CanvasRenderer.tsx`

定向测试命令：
- `pnpm exec vitest run --project unit packages/core/src/utils/__tests__/transform.test.ts`
- `pnpm exec vitest run --project unit packages/core/src/utils/router/__tests__/router.test.ts`
- `pnpm exec vitest run --project unit packages/renderer/src/components/__tests__/RendererContainer.test.ts`
- `pnpm exec vitest run --project unit packages/core/src/designer/__tests__/editManager.test.ts`

当前容器级测试夹具：
- `packages/renderer/src/components/__tests__/rendererTestHarness.ts`
- 用途：挂载 `DesignerProvider + RendererContainer`，stub viewport/scene 几何，统一派发 `mousedown / mousemove / mouseup / wheel / scroll`
- 当前已覆盖：`box select / scroll 后框选 / zoom 下拖拽 / ctrl+wheel / resize / rotate / shift 旋转吸附`

下一批建议优先补：
1. `Ctrl/Cmd+C/X/V/D`
2. `create-linker` 工具态
3. `LinkCreateOverlay` 显示与触发
4. `auto-scroll`
5. `zoom / scroll -> drag|resize|rotate` 串联场景

手工回归清单（playground）：
1. `Ctrl + 滚轮` 缩放后，缩放中心点不跳变。
2. 框选矩形与选中结果一致（含滚动容器场景）。
3. 单选后 resize 手柄命中准确（不同 zoom）。
4. 拖拽到视口边缘时自动滚动连续。
5. 连线端点拖拽时锚点高亮与吸附位置一致。
6. `Ctrl/Cmd+C/X/V/D` 与 toolbar 操作后，selection 与 undo/redo 粒度一致。

## 4. 构建说明
- Turbo 任务配置：`turbo.json`
- 产物输出：各包 `dist/`
- `@diagen/core`、`@diagen/shared`、`@diagen/primitives`、`@diagen/renderer` 使用 `tsdown`

## 5. 当前环境注意
- 若本地终端缺少 `node/pnpm`，无法在当前会话执行构建与测试；
  需先配置 Node.js 与 pnpm 再进行自动化验证。

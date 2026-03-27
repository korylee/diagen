# 仓库结构速览

## 1. 根目录
- `.processon/`：参考实现
- `AI_KB/`：知识库
- `packages/`：业务包
- `playgrounds/`：联调入口
- `turbo.json` / `vitest.config.ts`：构建与测试配置

## 2. packages
- `packages/core/`
  - `src/model/`：Diagram / Shape / Linker / Page
  - `src/designer/managers/`：`element / edit / selection / history / view / tool / group / clipboard`
  - `src/schema/`：默认 shape / linker schema
  - `src/utils/`：坐标、锚点、路由等
- `packages/renderer/`
  - `src/components/RendererContainer.tsx`：交互主入口
  - `src/components/InteractionOverlay.tsx`：选框、手柄、锚点、快捷入口
  - `src/components/LinkCreateOverlay.tsx`：快捷建线入口
  - `src/primitives/`：`pan / selection / shapeDrag / resize / rotate / linkerDrag`
  - `src/components/__tests__/rendererTestHarness.ts`：容器级测试夹具
  - `src/components/__tests__/RendererContainer.test.ts`：容器级交互回归
- `packages/primitives/`
  - 浏览器基础能力
- `packages/shared/`
  - 数学、对象工具、通用类型
- `packages/icons/`
  - SVG 图标资产与生成脚本
- `packages/components/`
  - `panel / actionBar / menu`
- `packages/ui/`
  - `toolbar / sidebar / iconRegistry`

## 3. 关键文件
- 交互入口：`packages/renderer/src/components/RendererContainer.tsx`
- 坐标归一化：`packages/renderer/src/primitives/createCoordinateService.ts`
- 快捷建线：`packages/renderer/src/primitives/createLinkerDrag.ts`
- 历史与事务：`packages/core/src/designer/managers/history.ts`
- 编辑命令：`packages/core/src/designer/managers/edit.ts`
- 剪贴板：`packages/core/src/designer/managers/clipboard.ts`

## 4. playground
- `playgrounds/vite/`
  - 当前唯一正式联调入口
  - 已组合 `@diagen/core + @diagen/renderer + @diagen/ui`

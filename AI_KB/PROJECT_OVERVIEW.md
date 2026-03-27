# 项目概览

## 1. 项目定位
- Diagen 是一个基于 SolidJS 的图形编辑器，当前主线是先补齐编辑器核心交互，而不是继续扩外围产品壳层。
- `.processon/` 保留为机制对照资料，不是运行时代码的一部分。

## 2. 技术形态
- TypeScript strict
- SolidJS
- pnpm workspace + Turbo
- Vite playground
- Vitest

## 3. 包职责
- `@diagen/core`
  - 模型、事务、选择、历史、视图、工具、剪贴板
- `@diagen/renderer`
  - 画布渲染、输入编排、overlay、交互原语
- `@diagen/primitives`
  - 浏览器能力封装
- `@diagen/shared`
  - 数学、对象工具、通用类型
- `@diagen/icons`
  - SVG 图标资产
- `@diagen/components`
  - 纯基础 UI 构件
- `@diagen/ui`
  - `Designer -> UI` bridge

## 4. 当前状态

已完成：
- `RendererContainer` 已接入 shape / linker 创建主链路。
- `LinkCreateOverlay` 已接入快捷建线运行时。
- `clipboard manager` 已支持 `copy / cut / paste / duplicate` 与事务化历史。
- `createToolbarBridge` 已有 undo/redo、group/ungroup、delete、zoom 入口。
- `rendererTestHarness` 已落地，已有首批容器级测试覆盖：
  - box select
  - scroll 后框选
  - zoom 下拖拽归一化
  - `ctrl + wheel`
  - resize
  - rotate
  - `shift` 旋转吸附
- `edit.update(id, 'props', wholeObject)` 已可正确 `undo / redo`。

当前缺口：
- `RendererContainer` 尚未接入 `copy / cut / paste / duplicate` 快捷键。
- `createToolbarBridge` 尚未补 clipboard 入口与 `canPaste` 等 disabled 条件。
- `LinkCreateOverlay / create-linker / auto-scroll / 更多 zoom-scroll 组合` 的容器级回归仍偏薄。
- 选择、拖拽、resize、rotate 的连续串联场景还需继续验证。
- move/resize 通用吸附线仍未进入主链路。
- 导入导出、评论、协作等产品层能力仍不在当前优先级。

## 5. 当前优先级
1. 补命令入口与快捷键闭环
2. 补 `renderer` 容器级交互回归
3. 打磨选择/拖拽/导航稳态
4. 进入 move/resize guide line
5. 再考虑外围 UI 与产品化能力

## 6. 运行入口
- Playground：`playgrounds/vite`
- 核心 API：`packages/core/src/designer/index.ts`

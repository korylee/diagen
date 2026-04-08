# Phase 1 实施指引

当前执行阶段：文本编辑

目标：
- 让 shape 与 linker 的文字进入正式可编辑状态。
- 先形成最小闭环，再补定位、交互细节与测试覆盖。

## 1. 本阶段范围

本阶段建议先做：
- shape 文本双击进入编辑
- Enter 提交
- Esc 取消
- blur 提交
- 提交后正确进入 history
- 编辑期间不破坏 selection
- linker 文字最小可编辑闭环

本阶段先不做：
- 富文本
- 多文本块批量编辑
- 文本样式面板
- IME 以外的复杂输入法增强
- markdown、公式、变量表达式

## 2. 设计边界

文档态：
- shape 文本仍落在 `shape.textBlock[].text`
- linker 文本仍落在 `linker.text`
- 字体与对齐继续复用现有 `fontStyle`

运行时：
- 文本编辑会话放在 `renderer / ui` 运行时，不进入 `Diagram`
- 编辑中的草稿不要直接写回文档
- 只有提交时才通过 `designer.edit` 落盘

约束：
- 不为旧编辑方式保留兼容层
- 不新增 `Document` 之类的协议层
- 命名保持短而稳定，避免为一次实现引入过长类型名

## 3. 建议实现顺序

1. 先完成 shape 单文本块编辑闭环
2. 再打通 selection / history / cancel 语义
3. 然后补 linker 文本编辑
4. 最后补文本定位、换行、对齐细节

原因：
- shape 文本是最直接的主链路
- 先拿到最小闭环，后续再扩到 linker，返工成本最低

## 4. 起手文件

数据模型与默认值：
- `packages/core/src/model/types.ts`
- `packages/core/src/model/shape.ts`
- `packages/core/src/model/linker.ts`
- `packages/core/src/schema/basic.ts`
- `packages/core/src/schema/defaults.ts`

编辑命令与历史：
- `packages/core/src/designer/managers/edit/index.ts`
- `packages/core/src/designer/managers/edit/commands.ts`
- `packages/core/src/designer/managers/edit/__tests__/index.test.ts`

渲染与交互：
- `packages/renderer/src/utils/render-utils.ts`
- `packages/renderer/src/components/Renderer/index.tsx`
- `packages/renderer/src/components/Renderer/handlers/sceneMouseDown.ts`
- `packages/renderer/src/components/Renderer/interaction/createPointerInteraction/index.ts`
- `packages/renderer/src/components/Renderer/index.test.ts`

UI 壳层：
- `packages/ui/src/editor/Editor.tsx`

## 5. 推荐实现策略

推荐策略：
- 先用覆盖层输入框或 textarea 做文本编辑
- 不在 canvas 内直接实现复杂文本输入
- 编辑框负责采集输入，最终仍回写现有模型字段

原因：
- canvas 适合渲染，不适合承接复杂输入行为
- 覆盖层更容易处理光标、选区、输入法与 blur
- 后续即便切到更复杂的文本编辑器，也不需要推翻文档模型

## 6. 最小验收标准

- 双击 shape 可进入文本编辑
- Enter 能提交且写入 undo/redo
- Esc 能取消且不污染文档
- blur 行为与提交规则一致
- 编辑结束后 selection 仍正确
- linker 文本可完成同样闭环

## 7. 对应测试

优先补：
- `packages/core/src/designer/managers/edit/__tests__/index.test.ts`
- `packages/renderer/src/components/Renderer/index.test.ts`

建议新增断言：
- 提交后 undo/redo 可恢复文本
- 取消编辑不会产生 history entry
- 双击进入编辑不会触发拖拽
- 编辑 linker 文本时不破坏现有 route 与选中态

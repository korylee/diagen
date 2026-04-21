# LinkerEndpoint 优化实施指引

## 1. 当前判断

`LinkerEndpoint` 的正式协议已经完成到 `binding.target` 方向，当前不再继续调整模型主方向。

当前最值得继续做的，不是再发明新的端点抽象，而是把现有交互体验继续收口到更接近 `draw.io / ProcessOn` 的状态：

- 清理测试与少量消费点里的旧口径，避免 `from.id / to.id` 继续干扰后续迭代
- 让 `perimeter` 吸附像 `fixed` 一样具备明确可见的预览反馈
- 允许用户在拖拽端点时显式表达“我要固定锚点”还是“我要边框附着”
- 在不改模型的前提下，继续降低端点拖拽过程中的跳变与抖动

本轮定义：

- 这是一次 **交互收口专项**，不是新的模型重构
- 不切换当前主阶段
- 不让 `port` 在本轮进入正式主链路

## 2. 实施目标

本轮实现目标：

1. 用户在拖拽端点时，能一眼区分当前是 `fixed` 还是 `perimeter` 吸附
2. 用户能显式切换连接方式，而不是只能接受当前的自动偏好结果
3. `create-linker`、端点重连、undo / redo、缩放滚动后的拖拽行为保持稳定
4. 知识库、测试和集成断言不再混用旧的顶层 `id` 语义

## 3. 非目标

本轮先不做：

- `target.kind === 'port'` 的正式交互、渲染与命中链路
- 新一轮 `LinkerEndpoint` 数据结构重构
- 连接方式的侧边栏设置、右键菜单、批量编辑 UI
- 路由器重写或大规模 hitTest 语义改造
- 为未知目标类型继续扩新的 endpoint target kind

## 4. 建议实现顺序

### 4.1 第一阶段：收口旧口径与测试基线

目标：

- 把渲染集成测试里仍然依赖 `from.id / to.id` 的断言统一迁移到 `binding.target`
- 明确本轮专项继续以 `binding.target.kind === 'element' && target 为 shape` 作为正式行为边界

优先文件：

- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts`
- `docs/CURRENT_PLAN.md`
- `docs/LINKER_ENDPOINT_REFACTOR.md`

建议动作：

- 统一把连线端点断言改成：
  - `binding.type === 'free'`
  - 或 `binding.type !== 'free' ? binding.target : null`
- 删除对顶层 `from.id / to.id` 的新依赖
- 补一句明确口径：当前消费点里，`element` 目标只正式保证 `shape` 主链路

验收：

- renderer 集成测试不再把顶层 `id` 当作正式事实源
- 端点相关文档只保留 `binding.target` 口径

### 4.2 第二阶段：补 perimeter 预览点

目标：

- 当前拖拽端点时，`fixed` 已有锚点预览；`perimeter` 仍缺少“当前将附着到哪里”的明确视觉反馈
- 这一阶段补齐 `perimeter` 预览点，让边框附着与固定锚点一样具备可感知的目标确认

优先文件：

- `packages/renderer/src/scene/overlays/LinkerOverlay/types.ts`
- `packages/renderer/src/scene/overlays/LinkerOverlay/index.tsx`
- `packages/renderer/src/scene/overlays/LinkerOverlay/SelectedLinkerOverlay.tsx`
- `packages/renderer/src/scene/overlays/LinkerOverlay/index.scss`

建议做法：

- 在 overlay model 中新增 `perimeterPreview` 或同等语义字段
- 当 `snapTarget().binding.type === 'perimeter'` 时，渲染一个单独的附着点预览
- 保持 `fixed` 仍使用整组 anchor preview + 当前 anchor 高亮
- `fixed` 与 `perimeter` 的视觉样式要有明确差异，但都要比当前仅高亮 shape 更具体

验收：

- 拖拽端点到 shape 边缘时，用户能看到明确的 perimeter 附着点
- 拖拽端点到 fixed anchor 时，仍保留现有 anchor preview 能力
- 两种预览不会同时误显示

### 4.3 第三阶段：补 fixed / perimeter 显式切换

目标：

- 让用户在拖拽时显式表达连接方式，减少“算法帮我选错了”的感觉
- 尽量复用 `draw.io` 的心智，而不是再设计一套全新的 UI

推荐口径：

- 默认：保持当前 `auto` 模式，继续沿用“fixed 优先、perimeter 回退”的现有偏好
- `Shift`：强制使用 `perimeter` / floating 连接
- `Alt`：强制使用 `fixed` / anchor 连接

说明：

- 若后续发现宿主快捷键或系统行为冲突，再调整按键映射；但第一轮建议先按该口径实现
- 第一轮不增加 toolbar toggle，不增加新的全局工具态

优先文件：

- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts`
- `packages/renderer/src/scene/Renderer.test.ts`

建议做法：

- 在拖拽更新链路中把当前修饰键状态收口成 `snapMode: 'auto' | 'fixed' | 'perimeter'`
- `findNearestAnchor()` 在 `fixed` 模式下只参与 fixed 候选；在 `perimeter` 模式下只参与 perimeter 候选；在 `auto` 模式下保持当前评分策略
- overlay 预览跟随 `snapMode` 与最终 `snapTarget` 一起变化
- `snapEndpoint()` finalize 阶段继续沿用同一套模式逻辑，避免 move / finalize 两套行为不一致

验收：

- 默认拖拽行为与当前版本兼容
- 按住 `Shift` 时，端点不会吸到 fixed anchor
- 按住 `Alt` 时，端点不会回退成 perimeter 吸附
- 缩放、滚动、undo / redo 后行为保持一致

### 4.4 第四阶段：补吸附稳定性微调

目标：

- 降低相邻锚点、边缘附着和自由点之间的频繁抖动
- 让正交线与普通折线在端点重连时都更接近预期

优先文件：

- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`
- 必要时补 `packages/renderer/src/utils/hitTest/linkerHitTest.ts` 的容差验证测试

建议做法：

- 强化已命中目标的 sticky 语义，不要在小范围移动中频繁改目标
- 一旦进入 `perimeter` 命中区域，可适当提高 perimeter stickiness，减少 free / perimeter 来回跳变
- 正交线端点拖拽时，结合当前端点出射方向做更强的角度偏好
- 只在体验需要时调参，不为调参引入新的复杂状态层

验收：

- 拖拽经过相邻 anchor 时，目标切换更平滑
- 贴边拖动时不会出现明显的 perimeter / free 来回闪烁
- orthogonal 连线端点重连后的出边方向更稳定

## 5. 涉及文件

模型与既有协议：

- `packages/core/src/model/linker.ts`
- `docs/LINKER_ENDPOINT_REFACTOR.md`

主要交互链路：

- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`

主要 overlay：

- `packages/renderer/src/scene/overlays/LinkerOverlay/index.tsx`
- `packages/renderer/src/scene/overlays/LinkerOverlay/types.ts`
- `packages/renderer/src/scene/overlays/LinkerOverlay/SelectedLinkerOverlay.tsx`
- `packages/renderer/src/scene/overlays/LinkerOverlay/index.scss`

优先测试：

- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts`
- `packages/renderer/src/scene/Renderer.test.ts`

当前预计不需要主动改动：

- `packages/core/src/designer/managers/clipboard.ts`
- `packages/core/src/designer/managers/element/indexes.ts`
- `packages/core/src/route/linkerRoute.ts`

原因：

- 本轮重点是交互反馈与拖拽吸附，不是模型与 route 协议升级
- 上述文件目前已基本跟上 `binding.target` 口径，不是本轮主风险点

## 6. 最小验收标准

- `binding.target` 成为连线端点的唯一正式目标口径，renderer 集成测试不再依赖顶层 `id`
- `fixed` 与 `perimeter` 在拖拽时都具备明确预览反馈
- 默认 / `Shift` / `Alt` 三种连接模式行为稳定且可预测
- 缩放、滚动、连续建线、undo / redo 下的端点拖拽行为保持一致
- 当前知识库可以直接回答“fixed 与 perimeter 的差异、预览由哪里负责、显式切换由哪里收口”

## 7. 推荐下一步

若下一轮直接进入实现，建议按下面顺序推进：

1. 先清理 `packages/renderer/src/scene/Renderer.test.ts` 中剩余的旧 `from.id / to.id` 断言
2. 再补 `LinkerOverlay` 的 perimeter 预览点
3. 再在 `createLinkerDrag.ts` 中补 `snapMode` 与 `Shift / Alt` 显式切换
4. 最后再做吸附稳定性微调与回归测试补齐

这样做的原因：

- 先清理旧口径，后续测试和调试成本最低
- perimeter 预览属于用户最容易感知的收益项，做完后更容易验证后续切换逻辑是否正确
- 显式切换建立在预览已经清晰的基础上，能避免“行为变了但看不出来”的问题
- 调参应放在功能语义稳定之后，否则容易一边改行为一边改体验，导致回归成本上升

---

最后更新：2026-04-21

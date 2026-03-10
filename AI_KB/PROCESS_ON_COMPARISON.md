# ProcessOn 对照与可迁移经验

本文件基于 `.processon/` 参考代码提炼，重点关注对 Diagen 当前坐标/交互架构最有价值的机制。

参考来源：
- `.processon/designer.core.js`
- `.processon/designer.events.js`
- `.processon/designer.methods.js`
- `.processon/designer.ui.js`

---

## 1. 坐标缩放机制：`toScale / restoreScale`

ProcessOn 关键实现：
- `Utils.toScale` 与 `Utils.restoreScale`
- `Number.prototype.toScale` / `restoreScale`
- 本质是统一的“模型坐标 <-> 屏幕坐标”双向映射

价值：
- 所有 UI 控件（选框、手柄、锚点、连线控制点）都遵循同一尺度逻辑
- 降低“某些层忘记换算”导致的漂移

Diagen 当前落点：
- `packages/core/src/utils/transform.ts` 中 `canvasToScreen / screenToCanvas`
- 已修复 `screenToCanvas(Bounds)` 的宽高反变换
- 新增回归测试：`packages/core/src/utils/__tests__/transform.test.ts`

---

## 2. 事件归一化：`getRelativePos + scroll`

ProcessOn 关键点：
- `getRelativePos(pageX, pageY, container)` 同时考虑 offset 与 scroll
- 该函数是大量交互行为的基础输入

价值：
- 保证滚动容器中的命中、拖拽、框选不会错位

Diagen 当前落点：
- `packages/renderer/src/utils/pointer.ts`
  - `eventToViewportPoint`
  - `eventToCanvasPoint`
- `Interaction` 暴露 `eventToCanvas` 能力，调用方不直接操作 viewport DOM

---

## 3. 框选策略：屏幕绘制，提交前回到模型坐标

ProcessOn 关键点：
- 框选盒子先以屏幕像素绘制
- 鼠标抬起时将选区恢复到模型坐标进行范围命中

价值：
- 视觉体验稳定（屏幕层操作），逻辑判断精确（模型层命中）

Diagen 当前落点：
- `createSelection` 内部维护 canvas bounds（命中逻辑使用模型坐标）
- `RendererContainer` 将其转为 screen bounds 后放入 overlay 渲染
- `SelectionLayer` 仅接收 `screenBounds`

---

## 4. 控制层统一绘制（selection/anchor/linker controls）

ProcessOn 关键点：
- `drawControls`
- `showAnchors`
- `showLinkerControls`
- 均在同一可控覆盖层按屏幕坐标渲染

价值：
- 交互控件尺寸稳定，不随 zoom 异常放大/缩小
- 控件与主图层职责分离

Diagen 当前落点：
- P2 后容器三层：
  - `world-layer`（有 transform）
  - `scene-layer`（无 transform）
  - `overlay-layer`（无 transform）
- `SelectionBox / SelectionLayer` 已在 overlay 渲染

---

## 5. 边缘自动滚动与画布扩容

ProcessOn 关键点：
- near-edge 自动滚动（定时推进）
- 形状超出页面后 `changeCanvas` 自动扩容

价值：
- 拖拽连续性更强
- 文档尺寸可随内容增长

Diagen 当前落点：
- `RendererContainer` 内已有 edge auto-scroll
- `view manager` 提供 `autoGrow` 能力（`scheduleAutoGrow` / `flushAutoGrow`）

---

## 6. 与 Diagen 的结构差异（必须意识到）

- ProcessOn 在一个大对象（Model/Utils/Designer）内集中管理大量状态与行为。
- Diagen 将“领域逻辑”和“渲染交互”分离：
  - core manager 负责语义与状态
  - renderer/primitives 负责交互会话

迁移策略建议：
- 迁机制，不迁实现形态。
- 优先迁“原则一致性”：单一坐标入口、覆盖层统一、输入归一化。

---

## 7. 可借鉴清单（供后续功能实现参考）

- 对齐线/吸附线：沿用 overlay 层屏幕绘制，模型层计算。
- 连线编辑控制点：保持“控制点屏幕渲染 + 模型更新”双轨。
- 高负载降级：参考 ProcessOn 的阈值策略，对交叉检测/装饰渲染做按量降级。

---

## 8. 小结

ProcessOn 给出的最有价值经验不是“API 名称”，而是三件事：
1. 坐标变换必须可逆且全局统一；
2. 输入归一化必须覆盖 scroll/offset；
3. 交互控件必须与主渲染层解耦。

Diagen 当前架构已吸收这三点，并进入可持续演进阶段。

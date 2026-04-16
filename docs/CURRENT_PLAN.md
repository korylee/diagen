# 当前计划实施指引

当前执行阶段：Phase3 容器与层级语义

目标：

- 让 `parent / child / container` 成为正式编辑语义，而不是继续由 `group` 间接模拟。
- 收口容器内拖拽、脱离、批量选择、history 与渲染反馈边界，为后续样式体系、多 page 和持久化建立稳定模型。

## 1. 当前计划状态

### 已完成阶段

- Phase1 基础交互主链路已完成。
- Phase2 连线编辑成熟度已完成，已形成正式能力集合：
  - 端点重连
  - 控制点编辑
  - 正交线路调整
  - 连线标签定位
  - line jump 收口
- shape / linker 文本编辑最小闭环已完成，不再作为当前主阶段。

### 当前阶段判断

当前计划**未整体完成**，但已经进入“容器与层级语义”的收尾阶段。

当前文档的职责是：
- 只描述当前阶段的执行口径
- 不再把连线编辑成熟度作为当前待办主线
- 明确哪些能力已经进入代码，哪些仍需继续收口与验证

## 2. 本阶段范围

本阶段建议先做：

- 明确容器命中、收纳、脱离与嵌套规则
- 收口拖拽进入容器、拖出容器与跨容器移动
- 收口容器选择、框选与批量操作
- 明确容器内外坐标、层级排序与关系修正规则
- 梳理容器相关 history / clipboard / selection 语义

本阶段先不做：

- 自动布局容器
- 容器专属样式面板
- 折叠容器的完整交互体系
- 跨 page 容器关系
- 面向业务 schema 的容器扩展协议

## 3. 设计边界

文档态：

- `shape.parent` / `shape.children` 承载正式层级关系
- `attribute.container` 表示该 shape 是否具备容器语义
- 若发生容器收纳或脱离，直接改正式字段，不引入过渡层
- `group` 继续保留，但不再承担容器语义兜底

运行时：

- 容器候选高亮、收纳预览、拖拽反馈继续放在 `renderer`
- 最终 parent 变更、层级修正与批量更新通过 `designer.edit` 落盘
- overlay 只负责反馈，不持有正式容器语义

约束：

- 不为旧的 group 使用方式增加兼容协议
- 不新增只服务临时过渡的容器状态结构
- 容器规则优先追求稳定、可预测，再追求复杂自动化

## 4. 当前判断

已进入代码并已基本稳定的能力：

- `packages/core/src/designer/managers/element/parenting.ts` 已提供容器层级解析与预览能力
- `packages/core/src/designer/managers/element/parenting.test.ts` 已覆盖最内层容器优先、拖拽父子集保持 parent、防止祖先挂到后代、脱离旧容器、非法父级修正
- `packages/core/src/designer/managers/edit/index.ts` 与 `packages/core/src/designer/managers/edit/commands.ts` 已把正式 parent / children 修正收口到 `designer.edit.parenting`
- `packages/renderer/src/scene/pointer/shape/createShapeDrag.ts` 已接入容器层级提交与拖拽反馈主链路
- `packages/renderer/src/scene/overlays/ContainerPreviewOverlay.tsx` 已提供容器候选高亮反馈
- `packages/core/src/designer/managers/clipboard.test.ts`、`packages/renderer/src/scene/pointer/shape/createShapeDrag.test.ts`、`packages/renderer/src/scene/Renderer.test.ts` 已覆盖拖入、拖出、跨容器、子元素 cut / paste / undo 等基础闭环

当前剩余缺口：

- 容器选择、框选与批量操作的正式规则还没有被单独收口成“阶段完成口径”
- `packages/renderer/src/scene/pointer/viewport/createBoxSelection.ts` 仍是平面相交即选中的最小实现，缺少容器专项断言
- `packages/core/src/designer/managers/selection.test.ts` 仍只有通用选区测试，缺少容器场景组合语义验证
- 当前文档仍引用旧路径，和实际实现入口存在偏差，容易造成后续执行误判

## 5. 建议实现顺序

1. 先明确容器命中与收纳规则
2. 再完成拖入、拖出与跨容器移动
3. 然后收口容器选择、框选与批量操作
4. 最后补 history、clipboard 与渲染反馈收尾

原因：

- 没有稳定收纳规则，后面的选择和历史语义都容易返工
- `parent / child` 关系修正是后续样式、多 page、持久化与导入导出的前置条件

## 6. 容器规则表

### 6.1 正式容器判定

- 只有 `shape.attribute.container === true` 的 shape 才能作为正式容器。
- linker、普通 shape、group 都不能被当成容器候选。
- 容器语义以文档模型为准；renderer 只能展示候选高亮，不能自行生成正式 parent 关系。

### 6.2 进入容器

- drag 结束或一次批量移动 commit 时，若元素最终落点命中容器候选，则允许进入容器。
- 容器候选以“当前实际命中的最内层可用容器”为准；若当前阶段无法稳定支持深层嵌套，则先退回单层最近容器规则。
- 若目标容器本身也在本次被拖拽集合内，禁止把元素收纳进该容器，避免形成自包含或循环层级。
- 若没有稳定命中任何可用容器，则保持原 `parent` 不变。

### 6.3 脱离容器

- 原本已有 `parent` 的元素，在 commit 时若最终落点已不命中原容器，也未命中新的合法容器，则视为脱离容器。
- 脱离时正式结果是：元素 `parent = null`，并从旧容器 `children` 中移除。
- 脱离判定只在一次操作提交时发生，不在拖拽移动中的每一帧持续改写模型。

### 6.4 跨容器移动

- 若元素原本属于容器 A，提交时命中合法容器 B，则视为跨容器移动。
- 跨容器移动必须同时完成三件事：从 A 的 `children` 移除、写入元素 `parent = B.id`、把元素加入 B 的 `children`。
- 同一批元素跨容器时，所有 reparent 结果应在同一次规则解析后统一提交，避免一部分先进新容器、一部分仍保留旧父级的中间脏态。

### 6.5 嵌套与候选优先级

- 当前阶段先以“可稳定命中的最内层容器优先”为目标规则。
- 若多个候选都命中但命中链不稳定，优先退回单层最近候选，不为了深层嵌套引入复杂启发式。
- 当前计划不提前承诺自动布局、容器 padding 规则或折叠容器命中修正；这些都属于后续阶段能力。

## 7. 事务与落盘边界

### 7.1 renderer 负责的内容

- `packages/renderer/src/scene/Renderer.tsx`、pointer 状态机与 overlay 只负责：
  - 命中检测
  - 候选容器高亮
  - 收纳预览
  - 拖拽中的临时几何反馈
- renderer 可以持有临时“候选 parent”概念，但这只能存在于交互会话中，不能直接写回 `shape.parent / children`。

### 7.2 core 负责的正式提交

- 正式层级修正必须通过 `packages/core/src/designer/managers/edit/index.ts` 执行。
- 事务边界统一复用 `packages/core/src/designer/managers/history.ts` 的 transaction / composite command 语义。
- 提交时至少要一次性收口：
  - `parent` 变更
  - 旧父容器 `children` 移除
  - 新父容器 `children` 写入
  - 必要的 selection 或排序修正

### 7.3 history 粒度

- 一次拖入容器、拖出容器或跨容器移动，只允许生成一个 history entry。
- 批量拖拽进入同一容器或多个容器时，也应尽量作为一次组合事务提交，而不是每个元素一个 undo 单元。
- move 过程中的 hover、高亮、候选命中变化都不进入 history。

### 7.4 坐标与排序边界

- 容器内外坐标换算、排序修正都属于正式 commit 的一部分，不应在 renderer 中形成独立事实源。
- 若当前实现暂时只支持平面坐标落盘，也要在 core 侧统一决定写法，不允许交互层与 manager 各写一套规则。

## 8. 组合语义矩阵

### 8.1 selection

- 当前阶段默认保持“选中什么就只选中什么”，选中 container 不自动隐式补齐 descendants，除非后续明确引入容器闭包规则。
- 框选跨容器元素时，结果应稳定为“实际命中的元素集合”，不因是否存在父容器而额外扩张。
- 若后续需要容器闭包，必须在 `selection` 或独立解析层统一实现，不能散落在 renderer 事件分支里。

### 8.2 clipboard

- `copy / cut / duplicate / paste` 复用 `packages/core/src/designer/managers/clipboard.ts` 的整体克隆与 id remap 语义。
- 若复制源内部已经存在 `parent / children` 关系，则粘贴后应整体重映射内部层级，而不是全部打平。
- 若复制的是容器与其子元素的完整闭包，粘贴后保留该闭包的层级关系。
- 若只复制子元素而未包含其父容器，则粘贴后不应保留一个指向外部旧容器的悬空 `parent`。
- `cut` 后以删除正式元素为准；`paste / duplicate` 后 selection 应切换到新对象集合。

### 8.3 history

- `clipboard_cut`、`clipboard_paste`、`clipboard_duplicate` 继续保持单事务语义。
- 容器场景下的拖入、拖出、跨容器移动，也应与 clipboard 一样保持单事务提交。
- undo / redo 的验证重点不是几何是否变化，而是 `parent / children / selection` 是否一起回滚到一致状态。

### 8.4 group 与容器的边界

- `group` 仍保留为批量语义与 clipboard 选择闭包工具，参考 `packages/core/src/designer/managers/group.ts`。
- 容器正式语义不能再依赖 group 兜底；若 group 与 container 同时存在，以 `parent / children` 为正式层级，以 `group` 为独立批量关系。

## 9. 起手文件

### 9.1 优先阅读入口

模型与组合入口：

- `packages/core/src/designer/create.ts`
- `packages/core/src/model/types.ts`
- `packages/core/src/model/shape.ts`
- `packages/core/src/designer/managers/element/parenting.ts`

正式 manager：

- `packages/core/src/designer/managers/edit/index.ts`
- `packages/core/src/designer/managers/selection.ts`
- `packages/core/src/designer/managers/group.ts`
- `packages/core/src/designer/managers/clipboard.ts`
- `packages/core/src/designer/managers/history.ts`

交互与渲染入口：

- `packages/renderer/src/scene/Renderer.tsx`
- `packages/renderer/src/scene/pointer/machine.ts`
- `packages/renderer/src/scene/pointer/shape/createShapeDrag.ts`
- `packages/renderer/src/scene/pointer/shape/createResize.ts`
- `packages/renderer/src/scene/pointer/shape/createRotate.ts`
- `packages/renderer/src/scene/pointer/viewport/createBoxSelection.ts`
- `packages/renderer/src/utils/hitTest/sceneHitTest.ts`

overlay 与反馈：

- `packages/renderer/src/scene/overlays/ShapeSelectionOverlay.tsx`
- `packages/renderer/src/scene/overlays/RectHighlightOverlay.tsx`

UI 壳层与调试入口：

- `packages/ui/src/editor/Editor.tsx`
- `playgrounds/vite`

## 10. 推荐实现策略

推荐策略：

- 先定义“什么情况下进入容器、什么情况下脱离容器”的最小正式规则
- 先保证单层容器稳定，再考虑更深层嵌套细节
- 容器关系修正优先在 `core` 收口，不把判断分散到 renderer
- 批量拖拽、框选和 clipboard 全部复用同一套 parent 修正规则

原因：

- 容器语义是正式模型，不应只靠交互层拼接
- 若单元素与批量元素走不同规则，后续 history 和导出会变脏

## 11. 最小验收标准

- shape 拖入容器后，`parent / children` 关系正确
- shape 拖出容器后，层级关系可正确恢复
- 跨容器移动后，旧容器和新容器关系同步修正
- 容器与普通 shape 的框选、批量选择结果稳定
- 容器相关操作只产生符合预期粒度的 undo/redo 单元
- 容器相关 clipboard 行为不破坏层级结构
- 当前知识库可以直接回答“何时只是预览，何时正式落盘”

## 12. 对应测试

优先补：

- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/core/src/designer/managers/group.test.ts`
- `packages/core/src/designer/managers/selection.test.ts`
- `packages/core/src/designer/managers/history.test.ts`
- `packages/core/src/designer/managers/element/parenting.test.ts`

建议新增断言：

- 拖入容器后 `parent` 与 `children` 同步更新
- 拖出容器后关系与位置修正正确
- 跨容器移动只生成一个 history entry
- 框选跨容器元素时 selection 结果稳定
- `copy / cut / paste / duplicate` 后层级关系保持预期
- undo / redo 后 `parent / children / selection` 仍保持一致

## 13. 收尾技术方案

目标：

- 不再扩展容器能力边界，而是把当前阶段已经进入代码的主链路变成可宣告完成的正式能力。
- 收尾的重点不是新增复杂交互，而是统一规则口径、补齐专项测试、清理文档偏差。

### 13.1 收尾原则

- 不新增新的容器状态结构，继续沿用 `shape.parent / shape.children / shape.attribute.container`
- 不引入“选中容器自动补齐全部子元素”的隐式闭包规则
- 不在 renderer 中直接写正式层级，只允许它提供命中、预览与临时反馈
- 先补“规则一致性 + 测试一致性”，再判断是否切换到下一阶段

### 13.2 工作包 A：冻结正式规则

目标：

- 把已经隐含在代码里的规则明确为阶段收尾口径，避免测试和实现继续各写一套

实施要点：

- 正式容器判定继续以 `shape.attribute.container === true` 为唯一入口
- 拖拽 reparent 继续以 `parenting.ts` 的 top-level target 过滤为准，避免父子同拖时对子元素重复改 parent
- 多选拖拽允许各 top-level 目标在一次解析中分别得到自己的 `nextParentId`；预览层只在所有目标预览父容器一致时显示高亮，不一致时返回 `null`
- 框选与点击选择继续保持“命中什么就选什么”的平面语义，不因为命中容器而自动扩张到 descendants

对应文件：

- `packages/core/src/designer/managers/element/parenting.ts`
- `packages/core/src/designer/managers/edit/index.ts`
- `packages/renderer/src/scene/pointer/shape/createShapeDrag.ts`
- `packages/renderer/src/scene/overlays/ContainerPreviewOverlay.tsx`

### 13.3 工作包 B：收口容器选择、框选与批量操作

目标：

- 把当前阶段最大的剩余不确定项收口到可验证、可回归的范围内

实施要点：

- 保持 `selection.ts` 为纯选区状态管理，不在 manager 内偷偷引入容器闭包
- 为 `createBoxSelection.ts` 增加容器专项测试，验证：
  - 框选命中容器与子元素时，结果是实际命中的元素集合
  - 命中 container 本身不自动补选 descendants
  - 跨容器元素框选时，不因为 parent 存在而额外扩张
- 为批量拖拽补专项测试，验证：
  - 多选目标预览父容器一致时出现预览高亮
  - 多选目标预览父容器不一致时不显示误导性预览
  - 同一批 top-level 目标提交后 `parent / children` 一次性收口

对应文件：

- `packages/renderer/src/scene/pointer/viewport/createBoxSelection.ts`
- `packages/renderer/src/scene/pointer/viewport/createBoxSelection.test.ts`
- `packages/core/src/designer/managers/selection.test.ts`
- `packages/renderer/src/scene/pointer/shape/createShapeDrag.test.ts`
- `packages/renderer/src/scene/Renderer.test.ts`

### 13.4 工作包 C：补齐 history / clipboard / selection 组合语义

目标：

- 让容器场景下的 undo / redo、cut / paste / duplicate 与 selection 恢复一起达到可宣告完成的粒度

实施要点：

- 为 clipboard 增加“复制容器与完整子树闭包后，粘贴仍保留内部层级映射”的断言
- 为 history / renderer 补充“跨容器批量拖拽只生成一个 history entry”的断言
- 为 undo / redo 补充“容器关系回滚后，selection 不出现悬空 ID”的断言
- 若新增断言发现 `selection` 仍依赖调用方手动清理，则只做最小修正，不扩散到范围外能力

对应文件：

- `packages/core/src/designer/managers/clipboard.test.ts`
- `packages/core/src/designer/managers/history.test.ts`
- `packages/renderer/src/scene/Renderer.test.ts`

### 13.5 工作包 D：文档与知识库扫尾

目标：

- 让知识库能够准确回答“当前阶段还差什么、做到什么程度算完成、下一步何时可以切换”

实施要点：

- 把所有旧路径替换为当前真实入口
- 把“已完成能力”和“剩余缺口”改成贴近实际代码的表述
- 在本文件保留收尾工作包与验收口径，不再把收尾信息散落到临时对话结论中
- 阶段完成后，再同步 `docs/PROJECT_OVERVIEW.md` 的“当前主要缺口”和阶段说明

### 13.6 推荐执行顺序

1. 先补框选与选择专项测试，冻结 selection 口径
2. 再补多选拖拽预览与批量 reparent 断言
3. 然后补 clipboard / history 组合语义断言
4. 最后回写文档状态，判断是否切换到下一阶段

原因：

- selection / box selection 是当前阶段唯一仍明显偏“最小实现”的区域
- 只有先把容器选择口径固定，history / clipboard 的回归标准才不会反复变化

### 13.7 阶段完成判定

满足以下条件后，才可以认为当前计划完成，并进入下一步计划：

- `parenting.ts`、`createShapeDrag.ts`、`ContainerPreviewOverlay.tsx` 的规则说明与实际行为一致
- `createBoxSelection.ts` 与 `selection.ts` 的容器语义已有专项测试覆盖
- 拖入、拖出、跨容器、批量拖拽、clipboard、undo / redo 的容器场景回归测试通过
- 当前知识库不再引用失效路径，且能准确说明“何时只是预览、何时正式落盘”

若以上条件未全部满足，则当前阶段仍视为“未完成但可收尾”，不应切换到样式体系与导航效率阶段

---

最后更新：2026-04-16

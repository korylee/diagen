# 当前计划实施指引

当前执行阶段：连线编辑成熟度

目标：
- 补齐连线作为流程图核心能力的编辑质量。
- 基于现有端点拖拽、控制点拖拽、线路文字编辑与 route 计算基础，收口成正式体验。

## 1. 本阶段范围

本阶段建议先做：
- 端点重连正式化
- 控制点编辑正式化
- 正交线路手动调整
- 连线标签正式定位
- line jump 稳定性与视觉收口

本阶段先不做：
- 富文本标签
- 多标签块连线
- 复杂线型样式面板
- 高级自动布线策略切换 UI
- 协作态下的连线冲突处理

## 2. 设计边界

文档态：
- 连线端点继续落在 `linker.from / linker.to`
- 手动线路继续落在 `linker.points`
- 连线文字仍落在 `linker.text`
- 若引入标签位置正式语义，直接进入 `LinkerElement`，不放运行时临时态

运行时：
- 端点拖拽、控制点拖拽、吸附预览仍放在 `renderer` 交互层
- overlay 负责手柄、高亮和拖拽反馈，不承载文档语义
- 只有提交后的结果通过 `designer.edit` 落盘

约束：
- 不为旧连线编辑方式保留兼容层
- 不新增只服务过渡阶段的中间协议
- 正交线路编辑规则优先追求稳定、可预测，再追求复杂度

## 3. 当前判断

已具备：
- 端点拖拽、控制点拖拽和 segment 插点基础能力已经存在
- 连线 overlay 已有端点手柄、控制点手柄、目标高亮与锚点预览
- 连线文字编辑最小闭环已打通
- line jump 计算与渲染基础已存在

当前核心缺口：
- 正交线路手动调整尚未形成正式语义
- 控制点缺少删除、合并、规范化规则
- 连线标签仍缺正式定位模型
- line jump 在高密交叉和复杂路线下还缺稳定性验证
- 连线编辑与 selection / history / auto-grow 的边界还需进一步收口

## 4. 建议实现顺序

1. 先完成端点重连正式化
2. 再完成控制点与正交线路编辑语义
3. 然后补连线标签正式定位
4. 最后收口 line jump 稳定性与视觉表现

原因：
- 端点重连是当前最接近完成态、收益最高的主链路
- 控制点和正交线路会决定 `linker.points` 的正式语义
- 标签定位应建立在稳定 route 语义之上，否则容易返工

## 5. 起手文件

模型与路由：
- `packages/core/src/model/linker.ts`
- `packages/core/src/utils/router/linkerRoute.ts`
- `packages/core/src/utils/router/index.ts`

交互与状态机：
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`
- `packages/renderer/src/scene/pointer/machine.ts`
- `packages/renderer/src/scene/events/createSceneMouseDown.ts`

overlay 与反馈：
- `packages/renderer/src/scene/overlays/LinkerOverlay/index.tsx`
- `packages/renderer/src/scene/overlays/LinkerOverlay/SelectedLinkerOverlay.tsx`

渲染与文字：
- `packages/renderer/src/utils/linkerText.ts`
- `packages/renderer/src/utils/render-utils.ts`
- `packages/renderer/src/scene/controls/textEditor/createTextEditorControl.ts`

测试：
- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts`
- `packages/core/src/utils/router/__tests__/router.test.ts`

## 6. 推荐实现策略

推荐策略：
- 先收口现有端点拖拽和控制点拖拽语义，再补新字段
- 对 `broken / orthogonal` 单独定义控制点规则，不与 `straight / curved` 混用
- 连线标签定位优先采用最小正式模型，而不是继续依赖运行时临时计算
- line jump 优先解决排序稳定性、密集交叉和端点 padding，再调视觉细节

原因：
- 当前仓库已有连线编辑基础，实现重点是“收口”和“定语义”
- 正交线路若没有点规范化规则，后续 history 与导出都会变脏
- 标签位置若不进入正式模型，后续持久化和导入导出仍会返工

## 7. 最小验收标准

- 选中 linker 后可稳定拖拽 `from / to` 端点重连
- 端点重连只产生一个 undo/redo 单元
- `broken / orthogonal` 可插入、拖拽、删除控制点
- 正交线路手动调整后仍保持可预测的线路语义
- 连线标签位置具有正式模型或明确正式策略
- line jump 在高密交叉下仍保持稳定

## 8. 对应测试

优先补：
- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.test.ts`
- `packages/core/src/utils/router/__tests__/router.test.ts`

建议新增断言：
- 端点从 `fixed / perimeter / free` 间切换时结果正确
- 一次端点重连只产生一个 history entry
- segment 插点、控制点拖动、控制点删除后 points 结构符合预期
- `orthogonal` 手动拖点后仍保持横纵段语义
- 标签位置在 route 变化后保持预期
- line jump 在反向 segment 和密集交叉下顺序稳定

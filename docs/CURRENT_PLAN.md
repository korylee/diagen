# 当前计划实施指引

当前执行阶段：Phase4 样式体系与导航效率

目标：

- 收口默认样式、批量样式应用与主题 preset 基础入口，让样式成为正式编辑能力，而不是零散字段。
- 收口缩放、适配、平移与高频导航动作的一致性，让长时间编辑体验更接近 `draw.io / ProcessOn`。

## 1. 当前计划状态

### 已完成阶段

- Phase1 基础交互主链路已完成。
- Phase2 连线编辑成熟度已完成，已形成正式能力集合：
  - 端点重连
  - 控制点编辑
  - 正交线路调整
  - 连线标签定位
  - line jump 收口
- Phase3 容器与层级语义已完成当前阶段验收：
  - `parent / children / container` 已进入正式模型
  - 拖入、拖出、跨容器移动已进入正式交互主链路
  - 容器场景下的 selection / clipboard / history 核心闭环已具备测试覆盖

### 当前阶段判断

当前计划已从“容器与层级语义”切换到“样式体系与导航效率”。

切换原因：

- 容器语义已经具备进入下一阶段所需的正式编辑基础，不再是主阻塞项。
- 当前最直接影响编辑器生产力的剩余短板，已经转移到样式操作效率与导航效率。
- 多 page、持久化与导入导出仍重要，但继续后置，优先补齐更直接影响日常编辑体验的能力。

## 2. 本阶段范围

本阶段建议先做：

- 先收口 `zoom in / zoom out / fit to content / fit to selection / actual size` 与 space 平移
- 再补导航动作的 UI action / 快捷键 / renderer 行为一致性
- 再收口默认样式入口，让新建 shape / linker 能稳定继承默认样式
- 再收口选中元素的批量样式应用语义
- 最后评估 `zoom preset / theme preset / minimap` 是否进入本阶段尾声

本阶段先不做：

- 面向业务的复杂主题系统
- 容器专属样式面板
- 多 page 导航 UI
- 正式持久化、导入导出与自动保存工作流
- 高级图库、业务 schema 扩展协议

## 3. 设计边界

样式语义：

- 正式样式仍以模型字段为准：`lineStyle / fillStyle / fontStyle / shapeStyle / theme`
- 默认样式与主题 preset 必须收口到正式模型或 schema 配置，不新增只服务临时 UI 的事实源
- 批量样式应用优先复用 `designer.edit`，保持单事务 history 语义

导航语义：

- 画布导航统一由 `view manager` 提供正式能力
- `renderer` 只负责事件采集与坐标换算，不额外维护第二套导航状态
- UI action 与快捷键必须共享同一组 view API，不允许动作入口和快捷键各写一套逻辑

约束：

- 不为了样式能力引入与当前项目不匹配的大型状态层
- 不提前做保存、导入导出、多 page 的宿主接入逻辑
- 导航能力优先追求一致、可预测，再追求更复杂的产品化外观

## 4. 当前判断

已进入代码并可复用的基础能力：

- `packages/core/src/model/shape.ts`、`packages/core/src/model/linker.ts` 已具备 `lineStyle / fillStyle / fontStyle / shapeStyle / theme` 字段基础
- `packages/core/src/schema/Schema.ts` 已具备默认样式与主题注册的基础入口
- `packages/core/src/designer/managers/view/index.ts` 已提供 `setZoom / setPan / pan / fitBounds / fitToContent / fitToSelection / zoomIn / zoomOut`
- `packages/renderer/src/scene/pointer/viewport/createPan.ts` 已支持 middle button 与 `Space + drag` 平移
- `packages/ui/src/actions/createActions.ts` 已接线 `zoom in / zoom out / fit to content` 动作
- `packages/ui/src/sidebar/creationMode.ts` 与 `packages/core/src/designer/managers/tool.ts` 已开始统一单个 / 批量创建模式的工具态连续性语义

当前核心缺口：

- `actual size`、`fit to selection`、`zoom preset` 仍缺少正式 UI action 与阶段验收口径
- 导航动作虽然已有 `view manager` 基础，但 `UI action / 快捷键 / renderer` 还没完全形成统一对外工作流
- 默认样式与新建元素之间还没有形成完整、明确的编辑工作流
- 批量样式应用尚未形成正式 manager 语义与测试口径
- 样式与导航的阶段验收标准仍需根据当前代码进度更新

## 5. 建议实现顺序

1. 先补齐导航动作入口（`actual size / fit to selection / zoom preset`）
2. 再统一导航动作在 UI action、快捷键与 renderer 手势中的行为
3. 然后收口默认样式入口
4. 再完成选中元素的批量样式应用
5. 最后评估 minimap 与阶段文档收尾

原因：

- `view manager`、`createPan` 与现有 toolbar action 已经具备导航基础，继续补齐入口和一致性，返工成本最低
- 默认样式入口虽然重要，但当前代码明显先进入了导航与工具态一致性收口，先顺势收口这部分更符合当前分支实际状态
- 批量样式应用依赖默认样式与正式样式入口更稳定之后再做，更不容易重写

## 6. 样式与导航规则表

### 6.1 默认样式

- 新建 shape / linker 时应优先继承当前正式默认样式，而不是在 UI 层临时拼装样式 patch
- 默认样式的事实源必须可被 `core` 直接回答，不能只存在于工具栏或侧边栏组件局部状态

### 6.2 批量样式应用

- 批量样式应用默认以“选中什么就修改什么”为原则
- 对不兼容的元素字段应跳过，而不是写入无效字段
- 一次批量样式修改应尽量形成一个 history entry

### 6.3 导航动作

- `zoom in / zoom out / fit to content / fit to selection / actual size` 应统一落到 `view manager`
- 鼠标滚轮缩放、快捷键、UI action 的行为应保持一致
- space 平移优先复用现有平移能力，不额外引入新的导航状态机

### 6.4 minimap

- 当前阶段先做必要性评估，不把 minimap 作为默认必须交付项
- 若接入，应优先保证只读预览与主视口同步，不提前承诺复杂交互

## 7. 事务与落盘边界

### 7.1 core 负责的内容

- 正式样式更新必须通过 `packages/core/src/designer/managers/edit/index.ts` 执行
- 默认样式与主题 preset 的正式来源必须可被 `core` 查询与测试
- 历史粒度继续复用 `packages/core/src/designer/managers/history.ts`

### 7.2 renderer / ui 负责的内容

- `renderer` 负责导航事件采集、滚轮缩放与坐标换算
- `ui/actions` 负责暴露导航与样式动作入口
- `ui` 只能驱动正式 API，不额外持有一套样式或导航事实源

## 8. 起手文件

### 8.1 优先阅读入口

模型与 schema：

- `packages/core/src/model/shape.ts`
- `packages/core/src/model/linker.ts`
- `packages/core/src/model/diagram.ts`
- `packages/core/src/schema/Schema.ts`

正式 manager：

- `packages/core/src/designer/create.ts`
- `packages/core/src/designer/managers/edit/index.ts`
- `packages/core/src/designer/managers/history.ts`
- `packages/core/src/designer/managers/view/index.ts`

交互与 UI：

- `packages/renderer/src/scene/Renderer.tsx`
- `packages/renderer/src/scene/pointer/viewport/createPan.ts`
- `packages/ui/src/actions/createActions.ts`
- `packages/ui/src/editor/Editor.tsx`

调试入口：

- `playgrounds/vite`

## 9. 最小验收标准

- `zoom in / zoom out / fit to content / fit to selection / actual size` 具备正式入口，并共享同一组 `view manager` API
- space 平移、滚轮缩放与 UI action 在行为上保持一致
- 新建 shape / linker 能稳定继承当前默认样式
- 批量样式应用能在一次操作中写入多个选中元素，并保持 undo / redo 一致
- 当前知识库可以直接回答“默认样式来源于哪里、导航状态来源于哪里、创建模式连续性由哪里统一维护”

## 10. 推荐下一步

当前分支更像是在收口“导航与工具态一致性”，而不是正式进入样式系统实现。

因此推荐下一步按下面顺序推进：

1. 在 `packages/ui/src/actions/createActions.ts` 补上 `view:actual-size`、`view:fit-selection`，必要时增加 `zoom preset`
2. 把对应入口接到 `packages/ui/src/toolbar/createToolbarBridge.ts` / `packages/ui/src/toolbar/Toolbar.tsx`
3. 给 `packages/core/src/designer/managers/view/index.test.ts` 增补 `actual size / fitToSelection` 的明确断言
4. 给 `packages/renderer/src/scene/Renderer.test.ts` 增补 `Space + drag`、缩放后导航动作与现有拖拽/编辑链路不冲突的回归
5. 导航闭环稳定后，再开始默认样式入口与批量样式应用的正式 manager 设计

这样做的原因：

- 现有代码已经有 `view manager + createPan + toolbar/sidebar/tool continuous` 的连续改动轨迹
- 先把导航闭环做完，可以更快形成本阶段一个可验证、可演示的子里程碑
- 样式系统目前仍停留在 `Schema` 默认值层，直接推进批量样式应用容易反复调整事实源

## 11. 对应测试

优先补：

- `packages/core/src/designer/managers/view/index.test.ts`
- `packages/renderer/src/scene/Renderer.test.ts`
- `packages/ui/src/actions/createActions.ts` 对应 bridge 测试（若已有）
- 导航闭环完成后，再补 `packages/core/src/designer/managers/edit/index.test.ts` / `history.test.ts` 的样式事务测试

建议新增断言：

- `actual size` 把 zoom 复位到 `1`
- `fitToSelection` 在空选区与单/多选场景下行为可预测
- `Space + drag` 与中键平移共享同一套 view 结果
- 工具栏动作不会破坏现有拖拽、建线、文本编辑主链路
- 导航入口补齐后，知识库描述与代码现状一致

---

最后更新：2026-04-20

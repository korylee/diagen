# Diagen 基础能力差距评估（2026-03-19）

目的：
- 聚焦“块”和“线”的基础创建体验，评估当前实现与 `.processon` 的真实差距。
- 输出一份可执行的补齐顺序，避免后续继续在 demo 级入口上叠功能。

---

## 1. 结论

当前项目的核心问题不是“不能创建块和线”，而是“创建不是一等交互能力”。

现状更接近：
- 已有元素编辑器
- 带部分图形创建按钮的 playground

而不是：
- 具备完整建图心智的在线绘图器

因此与 `.processon` 的体感差距主要来自三点：
1. 缺少正式的创建工具链路。
2. 连线创建仍停留在“结果导向”，没有形成“交互导向”。
3. 创建后的结构联动不够完整，导致块和线不像一个整体系统。

---

## 2. 当前已具备的能力

### 2.1 块（shape）

已有：
- Schema 注册与图元实例化：`packages/core/src/schema/Schema.ts`
- 基础形状定义：`packages/core/src/schema/basic.ts`
- 形状添加/更新/删除/移动：`packages/core/src/designer/managers/edit.ts`
- 形状拖拽、缩放、旋转：`packages/renderer/src/primitives/createShapeDrag.ts`、`packages/renderer/src/primitives/createResize.ts`、`packages/renderer/src/primitives/createRotate.ts`
- Guide 吸附线 overlay：`packages/renderer/src/components/InteractionOverlay.tsx`

说明：
- “编辑已有 shape”的链路已经基本成型。
- 问题不在编辑，而在创建入口和创建后的连续操作体验。

### 2.2 线（linker）

已有：
- 连线模型与 endpoint binding：`packages/core/src/model/linker.ts`
- 连线 Schema：`packages/core/src/schema/Schema.ts`
- 连线路由入口：`packages/core/src/utils/router/linkerRoute.ts`
- 连线选中、端点拖拽、控制点拖拽：`packages/renderer/src/primitives/createLinkerDrag.ts`
- 连线 overlay 与候选连接目标高亮：`packages/renderer/src/components/InteractionOverlay.tsx`

说明：
- “编辑已有 linker”的能力比之前完整很多。
- 但“从 0 到 1 创建 linker”的交互仍明显弱于 `.processon`。

---

## 3. 与 `.processon` 的核心差距

## 3.1 P0：缺少正式的创建工具状态

当前：
- 创建块依赖 playground 按钮直接调用 `Schema.createShape(...)`
- 创建线依赖 toolbar 中“选中两个图形后点按钮”调用 `Schema.createLinker(...)`
- 见：`playgrounds/vite/src/App.tsx`

`.processon`：
- 创建是工具模式，不是辅助按钮。
- 用户先进入某个图形/连线工具，再在画布上直接落点、拖出、连接。

影响：
- 无法形成流程图编辑的基本操作节奏。
- 用户操作路径比 `.processon` 多一层“先选中再执行”，手感会明显生硬。

需要补：
- 新增 `tool manager` 或 `creation mode`
- 统一支持：
- `idle`
- `create-shape`
- `create-linker`
- 后续可扩展：
- `text`
- `hand`

---

## 3.2 P0：块创建缺少“落点式创建”与“连续创建”

当前：
- 块只能按按钮插入到随机或预设位置。
- 没有鼠标落点创建。
- 没有拖拽拉框创建。
- 没有“连续创建同类图形”的模式。

`.processon` 典型能力：
- 从左侧面板拖出图形到画布。
- 在画布点击即创建。
- 创建完成后保留当前工具，可连续放置。
- 放下后立刻进入可编辑或可连接状态。

影响：
- 当前系统更像 demo，不像图编辑器。
- 即便底层有 shape schema，用户仍然感知不到“建块效率”。

需要补：
1. 画布点击落点创建 shape。
2. 可选支持拖拽决定初始尺寸。
3. 创建后自动选中。
4. 支持连续创建和 `Esc` 退出工具。

---

## 3.3 P0：线创建没有“从锚点拖出”的主入口

当前：
- 已有 linker 拖拽与端点重连。
- 但缺少从 shape 锚点直接拖出新线的主交互。

`.processon` 典型能力：
- 选中 shape 后出现连接控制点。
- 从锚点拖出即可创建新线。
- 拖到目标 shape 自动高亮、吸附、绑定。
- 松手即可完成连接。

当前缺口本质：
- 项目已经实现了“编辑现有线”，还没有实现“创建新线时复用同一套端点拖拽能力”。

需要补：
1. 在 `AnchorPreview` 或 `ShapeSelectionOverlay` 暴露可拖出的出线手柄。
2. 鼠标按下时先创建临时 linker。
3. 将临时 linker 交给 `pointer.machine.startLinkerDrag(...)`
4. 结束时：
- 若成功连到目标 shape，则提交事务
- 否则按策略：
- 保留自由线
- 或取消临时线

这是当前弥补差距收益最高的一项。

---

## 3.4 P1：连线路由主链路已补齐基础闭环，后续重点转为调优

当前（2026-03-19 已完成 P1-A）：
- `view.getLinkerLayout(...)` 已接入运行时 route config
- 默认 `broken/orthogonal` 走 `obstacle`，并使用 `hybrid` 算法
- `straight/curved` 默认保留 `basic`
- `lineJumps` 已打通到主渲染链
- 见：`packages/core/src/designer/managers/view.ts`、`packages/core/src/utils/router/lineJumps.ts`、`packages/renderer/src/utils/render-utils.ts`

这意味着：
- obstacle router 不再只是“旁路能力”，而是 broken/orthogonal 的默认主链路。
- line jump 已具备最小可用闭环。
- 复杂图的连线可读性较之前有明显改善，但仍未完全达到 `.processon` 的成熟度。

`.processon` 体感优势来源：
- 连线会更主动地绕开图形和保持阅读性。

后续仍需补：
1. 优化 obstacle/hybrid 在高密度场景下的路径质量与性能阈值。
2. 细化 `lineJumps` 视觉规则（层级、跨越方向、样式一致性）。
3. 将 route config 暴露到更正式的产品设置入口，而不只停留在 runtime config。
4. 为“创建新线”场景继续增强 anchor / perimeter 自动选择策略。

---

## 3.5 P1：线和块的结构联动还不够彻底

当前已具备：
- endpoint 绑定
- shape move 后 linker layout dirty 重算

仍需核实/补强：
1. 分组后内部连线的绑定策略是否与 `.processon` 一致
2. 复制粘贴后 linker endpoint 的 ID 重映射
3. 删除 shape 时关联 linker 的策略
4. 容器 shape / parent-child / family shape 联动

`.processon` 的基础体验强，不只因为能画线，而是因为线和块在结构上是联动的。

---

## 3.6 P1：块侧 schema 仍偏少，导致“基础功能看起来不完整”

当前基础图元只有：
- rectangle
- roundedRectangle
- circle
- diamond
- parallelogram
- ellipse

见：`packages/core/src/schema/basic.ts`

这不足以支撑流程图用户对“基础块”的预期。

至少应尽快补：
- terminator
- process
- decision
- data
- document
- subProcess
- text

如果不补，用户会把“图元不足”误判为“编辑器基础能力不足”。

---

## 3.7 P2：创建链路还停留在 playground，不在 renderer/core 契约里

当前：
- 创建入口主要写在 `playgrounds/vite/src/App.tsx`
- 这说明产品级创建能力没有沉到 `core` + `renderer` 的正式抽象层

后果：
- playground 能跑，不代表编辑器能力完整
- 后续做真正应用层时还要重做一遍工具系统

正确方向：
- `core` 负责创建命令与事务
- `renderer` 负责工具态和鼠标交互
- playground 只消费正式 API，不再手写 demo 创建逻辑
- 评论/批注若需要，应由应用层在 `renderer/core` 之外组合实现，不进入基础架构模型。

---

## 4. 弥补顺序

建议不要同时推很多功能，先把“创建链路”补成型。

### 第一阶段：把创建变成一等交互（P0）

目标：
- 用户可以像 `.processon` 一样，直接在画布上创建块和线。

实施项：
1. 新增 `tool manager`
2. shape 点击落点创建
3. shape 连续创建模式
4. 从锚点拖出新 linker
5. 创建事务统一走 history

交付后效果：
- 项目会从“能编辑图”提升到“能画图”

### 第二阶段：把线的可读性补起来（P1）

实施项：
1. 已完成：router strategy 接入 `view`
2. 已完成：broken/orthogonal 默认接 obstacle/hybrid
3. 已完成：`lineJumps` 渲染闭环（最小实现）
4. 已完成基础版：创建线时固定锚点优先，perimeter 回退

交付后效果：
- 线不再只是能连，而是更像 `.processon` 的阅读体验

### 第三阶段：把结构关系补齐（P1）

实施项：
1. clipboard manager
2. group/linker 结构保持
3. 删除/复制/粘贴的 endpoint 关系修复
4. parent-child/container 语义明确化

交付后效果：
- 线和块会开始表现为“一个整体系统”

### 第四阶段：补基础图元与创建面板（P2）

实施项：
1. 扩充基础流程图 schema
2. 分类面板/图元面板
3. 最近使用 / 常用图形
4. 双击快速创建 / 拖拽入画布

交付后效果：
- 体感才会真正接近 `.processon`

---

## 5. 最值得先做的三个点

如果只做三个点，优先顺序建议如下：

1. 从 shape 锚点拖出创建新线
- 这是“像不像 ProcessOn”的最大分水岭。

2. shape 工具模式 + 点击落点创建
- 这是“是不是编辑器”的基本线。

3. 将 linker route 从 `basic` 升级为可配置主链路
- 这是连线阅读性的主要来源。

---

## 6. 一句话判断

Diagen 现在离 `.processon` 的差距，主要不在“编辑 primitives 不够”，而在“创建工具系统还没有正式落地”。先补工具态，再补路由和结构联动，收益最高。

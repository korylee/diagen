# Shape 右上角快捷创建连线设计（2026-03-23）

目的：
- 为单个选中 shape 提供“右上角连线列表”。
- 用户点击列表中的某种连线后，立即进入“从当前 shape 发起新线”的交互。
- 复用现有 `createLinkerDrag`、`history.transaction`、`tool manager` 基础设施，不另起一套连线编辑系统。

---

## 1. 交互目标

目标交互：
1. 用户选中一个块。
2. 在块的右上角出现“连线创建列表”。
3. 列表中展示可快速创建的连线类型：
- 折线 `linker`
- 直线 `straight_linker`
- 曲线 `curve_linker`
4. 用户在某个列表项上按下鼠标。
5. 系统立即创建一条临时新线，并自动将其 `from` 端绑定到当前 shape 的合适锚点。
6. 鼠标继续拖动时，进入现有的 `linkerDrag` 逻辑，拖拽的是新线的 `to` 端。
7. 松手时：
- 若吸附到目标 shape，则完成连接并提交为一个 undo 单元。
- 若拖动距离不足，则整条临时线回滚。
- 若拖动有效但未连接到目标 shape，可保留为自由连线。

说明：
- 这里的“点击创建”在实现上应使用 `onMouseDown` 启动，而不是 `onClick`。
- 原因是要保留同一条 pointer 链路，避免用户点一下后还要再拖第二次。

---

## 2. 为什么采用“右上角列表”而不是直接暴露锚点按钮

直接暴露锚点按钮的问题：
1. 锚点数量会随图形而变化，视觉噪音大。
2. 锚点更适合“编辑已有线的端点重连”，不适合作为“选择连线类型”的入口。
3. 用户先决定“画什么线”，再决定“拖到哪里”，认知路径更稳定。

右上角列表的优势：
1. 与当前 `ShapeSelectionOverlay` 的视觉归属一致。
2. 可以明确区分折线/直线/曲线。
3. 后续可扩展“默认箭头样式”“默认文本”“默认路由策略”而不污染锚点层。

结论：
- “右上角列表”负责选择连线类型。
- “shape 锚点”负责决定新线从哪里长出来。

---

## 3. UI 方案

建议新增 overlay：
- 名称：`ShapeLinkerQuickCreateOverlay`
- 放置位置：`packages/renderer/src/components/InteractionOverlay.tsx`

显示条件：
1. 当前仅选中一个元素。
2. 该元素是 `shape`。
3. 该元素 `attribute.linkable !== false` 且未锁定。
4. 当前交互状态为空闲：
- 非 `draggingShape`
- 非 `draggingLinker`
- 非 `resizing`
- 非 `rotatingShape`
- 非 `boxSelecting`

布局建议：
- 相对选中框右上角外侧偏移显示。
- 使用竖向小浮层，包含 3 个 action item。
- 每个 item 包含：
- 小图标
- 文案
- `linkerId`

建议文案：
- `折线`
- `直线`
- `曲线`

行为建议：
- `onMouseDown` 启动创建
- `pointer-events: auto`
- overlay 本身不进入持久态

---

## 4. 运行时链路设计

## 4.1 新增能力入口

当前已有：
- `pointer.machine.startLinkerDrag(...)`
- `createLinkerDrag.start(...)`

它们适合：
- 编辑已有 linker

但不适合：
- 创建一条新的 linker 再进入拖拽

因此建议新增一层明确入口：
- `pointer.machine.startQuickCreateLinker(...)`

建议签名：

```ts
startQuickCreateLinker(
  e: MouseEvent,
  options: {
    sourceShapeId: string
    linkerId: string
  }
): boolean
```

`InteractionMachine` 不负责创建细节，只负责模式切换。

实际创建动作应下沉到：
- `createLinkerDrag.startCreateFromShape(...)`

建议签名：

```ts
startCreateFromShape(
  e: MouseEvent,
  options: {
    sourceShapeId: string
    linkerId: string
  }
): boolean
```

---

## 4.2 `createLinkerDrag.startCreateFromShape(...)` 的职责

此方法应负责 5 件事：

1. 解析 source shape
- 校验 shape 存在、可连接、未锁定

2. 决定起点锚点
- 从 shape 上选一个“最合理的 from 端”

3. 创建临时 linker
- 调用 `Schema.createLinker(...)`
- 再通过 `designer.edit.add(...)` 加入 diagram

4. 启动拖拽会话
- 将该 linker 交给现有 `linkerDrag` 逻辑
- 直接以 `to` 端拖拽模式进入

5. 保证撤销事务正确
- “添加 linker + 拖拽 endpoint + 最终绑定”必须是一个事务

---

## 4.3 事务策略

当前 `createLinkerDrag.start(...)` 内部会调用：
- `history.transaction.createScope('拖拽连线')`

但对于“新建 + 拖拽”场景，仅包住拖拽是不够的。

因为：
- 临时 linker 的 `edit.add(...)` 也必须纳入同一个事务
- 否则取消拖拽时，只会撤销 endpoint 更新，不会删除临时线

因此建议重构 `createLinkerDrag`：

方案：
1. 将“事务开启 + session 初始化”抽成内部函数。
2. `startCreateFromShape(...)` 先 `transaction.begin()`
3. 在事务中执行：
- `edit.add([tempLinker])`
- 建立 `dragState`
- `session.begin(...)`
4. `end()` 时：
- 成功则 `transaction.commit()`
- 失败则 `transaction.abort()`

这样可以保证：
- 一次快捷建线 = 一个 undo 单元

---

## 5. Source 锚点选择策略

这是本设计的关键。

用户虽然是从“右上角连线列表”发起，但线必须从 shape 的真实锚点或边界长出来，而不是从菜单位置长出来。

建议优先级：

1. 优先固定锚点 `direction === 'right'`
- 右上角菜单天然偏向右侧出线
- 对折线/直线最稳定

2. 若不存在 `right`，回退到 `direction === 'top'`

3. 若 shape 没有带 `direction` 的标准锚点
- 取 shape 上“最接近右上象限”的固定 anchor

4. 若固定 anchor 不适合
- 回退到 perimeter 绑定

建议新增 `core` helper：
- 位置：`packages/core/src/utils/anchors/index.ts`
- 名称示例：`resolvePreferredCreateAnchor(shape, options)`

建议返回结构：

```ts
type PreferredCreateAnchor =
  | {
      binding: { type: 'fixed'; anchorId: string }
      point: Point
      angle: number
    }
  | {
      binding: { type: 'perimeter'; pathIndex: number; segmentIndex: number; t: number }
      point: Point
      angle: number
    }
```

建议参数：

```ts
resolvePreferredCreateAnchor(shape, {
  preferredDirections: ['right', 'top']
})
```

理由：
- 让“快捷创建连线”的起点规则固定、可测试、可复用
- 后续 toolbar/side panel/global create-linker 也能复用

---

## 6. 临时 linker 的初始值

建议初始化如下：

`from`
- `id = sourceShape.id`
- `binding = preferred binding`
- `x/y = preferred anchor point`
- `angle = preferred angle`

`to`
- 初始与 `from` 相同
- `id = null`
- `binding = { type: 'free' }`

`points`
- `[]`

`linkerType`
- 来自列表项对应的 schema linker

创建后：
- 立即选中新 linker
- 再进入 `mode = 'to'` 的拖拽流程

原因：
- 视觉上会更像 ProcessOn 的“从块上长出一条新线”

---

## 7. 结束态策略

建议如下：

### 7.1 未超过拖拽阈值
- 视为误触
- `transaction.abort()`
- 临时 linker 被回滚删除

### 7.2 超过阈值，但未连到目标 shape
- 保留为自由连线
- `to.id = null`
- `binding = free`
- 事务提交

### 7.3 成功连到目标 shape
- 提交事务
- 选中新建 linker
- 保持当前 shape 选区清空或切换到 linker

建议：
- 创建成功后，默认选中新 linker
- 原因是用户下一步最常见动作是调线、改箭头、加文本

---

## 8. 与 `tool manager` 的关系

当前 `tool manager` 已支持：
- `create-shape`
- `create-linker`

但这次需求不建议直接走全局工具态。

理由：
1. 这是“上下文快捷动作”，不是“全局持久工具切换”。
2. 用户已经先选中了某个 shape，意图非常具体。
3. 若强行切换到 `tool.create-linker`，会污染已有 toolbar/sidebar 的激活态逻辑。

建议边界：
- `tool manager` 继续服务于 toolbar / sidebar / palette 的持久工具
- `quick create overlay` 走“一次性会话”能力

但两者底层应复用同一个创建 API：
- `createLinkerDrag.startCreateFromShape(...)`

---

## 9. 涉及文件建议

必改：
- `packages/renderer/src/components/InteractionOverlay.tsx`
- `packages/renderer/src/primitives/createInteractionMachine.ts`
- `packages/renderer/src/primitives/createLinkerDrag.ts`

建议新增/补充：
- `packages/core/src/utils/anchors/index.ts`
- `packages/core/src/utils/anchors/__tests__/index.test.ts`

如果要抽组件：
- `packages/renderer/src/components/ShapeLinkerQuickCreateOverlay.tsx`

如果要接 icon：
- `packages/icons/`
- 或复用 `packages/designer-ui` 的 icon registry，但本需求不必强依赖

---

## 10. 推荐实现顺序

第一步：
- 先在 `core` 增加 `resolvePreferredCreateAnchor(...)`
- 先把 source anchor 决策做成纯函数并补测试

第二步：
- 在 `createLinkerDrag` 增加 `startCreateFromShape(...)`
- 打通事务闭环

第三步：
- 在 `InteractionMachine` 增加 `startQuickCreateLinker(...)`

第四步：
- 在 `InteractionOverlay` 增加右上角快捷列表 UI

第五步：
- 选中态、取消态、误触、自由线保留策略回归测试

---

## 11. 不建议的方案

不建议方案 A：
- 在 `InteractionOverlay` 里直接 `Schema.createLinker(...) + edit.add(...) + window mousemove` 自己维护拖拽

原因：
- 会复制 `createLinkerDrag` 的行为
- 后续 endpoint hit、吸附、事务、autoGrow 会分叉

不建议方案 B：
- 点击列表项仅设置 `tool.setCreateLinker(...)`，再让用户去画布上重新点起点

原因：
- 多一步
- 违背“基于当前选中 shape 直接创建”的需求

不建议方案 C：
- 新线起点固定从 shape 几何中心出发

原因：
- 视觉上不专业
- 与已有 endpoint binding 模型冲突

---

## 12. 最终设计判断

本需求的正确落点不是“再加一个浮层按钮”，而是：
- 为现有 `linkerDrag` 增加“创建新 linker 再进入拖拽”的正式入口，
- 然后用 `ShapeSelectionOverlay` 右上角的连线列表作为这个入口的 UI 壳。

这样做的收益：
1. 满足当前需求。
2. 不破坏既有连线编辑模型。
3. 后续 toolbar / sidebar / palette / AI 指令创建连线都能复用同一条链路。

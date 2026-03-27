# Shape 右上角快捷创建连线设计（2026-03-23）

状态说明（2026-03-27）：
- 本文保留为专题设计记录，不再承担“当前进度/近期计划”说明。
- 实际实现已采用等价收口：`LinkCreateOverlay + InteractionMachine.beginLinkerCreate(...) + createLinkerDrag.beginCreate(...)`。
- 早期文稿中的 `startQuickCreateLinker(...) / startCreateFromShape(...)` 只是中间命名草案，没有作为公开 API 保留。

目标：
- 单选 shape 时，在选区右上角提供快捷建线入口。
- 用户按下某个连线类型后，直接从当前 shape 发起新线，并无缝进入现有拖拽会话。
- 复用既有 `linkerDrag`、`history.transaction`、endpoint 吸附与 overlay 体系，不再复制一套建线逻辑。

---

## 1. 最终交互约定

1. 用户单选一个可连接、未锁定的 `shape`。
2. 选区右上角出现连线创建入口，提供 `折线 / 直线 / 曲线`。
3. 用户在入口上 `mousedown`，立即创建一条临时 linker，并把 `from` 端绑定到当前 shape 的合适出线点。
4. 同一条 pointer 链路继续拖动新线的 `to` 端，复用既有 `linkerDrag` 会话。
5. 松手时：
   - 命中目标 shape：完成绑定并提交事务。
   - 超过阈值但未命中：保留为自由连线并提交事务。
   - 未超过阈值：视为误触，整次创建回滚。

关键点：
- 必须用 `onMouseDown` 启动，而不是 `onClick`，这样才不会把“创建”和“拖拽”拆成两次输入。
- 一次快捷建线始终对应一个 undo 单元。

---

## 2. 为什么是“右上角列表”而不是锚点按钮

- 锚点数量随图形变化，直接暴露会带来噪音，更适合已有连线的端点重连，不适合作为“选线型”入口。
- 右上角列表先表达“我要画什么线”，再进入“拖到哪里”，认知路径更稳定。
- 这类入口属于选中态的上下文动作，视觉上应归属 `ShapeSelectionOverlay`，而不是并入锚点层。

结论：
- 右上角列表负责“选择连线类型”。
- shape 锚点或 perimeter 负责“决定新线从哪里长出来”。

---

## 3. 设计边界

显示条件：
- 当前仅选中一个元素。
- 该元素是 `shape`。
- 元素可连接、未锁定。
- 当前不在 `draggingShape / draggingLinker / resizing / rotating / boxSelecting` 会话中。

状态边界：
- overlay 只负责 UI 入口，不持久化状态。
- `tool manager` 继续服务于 toolbar / palette 的持久工具态。
- 快捷建线属于一次性上下文动作，不应污染全局 `create-linker` 激活态。

不采用的方案：
- 不在 overlay 内自行维护一套 `mousemove / mouseup` 建线流程，避免与 `createLinkerDrag` 分叉。
- 不要求用户先点按钮切到全局 `create-linker`，再回画布选起点，这会破坏“基于当前选中 shape 直接创建”的目标。
- 不让新线从 shape 中心硬编码长出，必须复用现有 endpoint binding 模型。

---

## 4. 实现映射

运行时收口：
- UI 入口：`LinkCreateOverlay`
- 交互编排：`createInteractionMachine`
- 新线创建与拖拽：`createLinkerDrag`

职责分工：
- overlay 负责显示条件、线型选择与 `mousedown` 触发。
- interaction machine 负责把这次输入导入正式交互会话。
- linker drag 负责创建临时 linker、进入 `to` 端拖拽、处理吸附与结束态。

事务要求：
- `edit.add(tempLinker)`、端点拖拽、最终绑定或回滚必须处于同一事务。
- 误触取消时，临时线应随事务回滚一起删除。

---

## 5. 起点与结束态约定

起点选择原则：
- 菜单在右上角，默认优先选择偏右的出线方向。
- 有标准方向锚点时，优先 `right`，其次 `top`。
- 没有合适固定锚点时，回退到最接近右上象限的 perimeter 绑定。
- 起点决策应保持可测试、可复用，而不是散落在组件事件里。

临时 linker 初始形态：
- `from` 端绑定当前 shape，并使用选中的起点。
- `to` 端初始与 `from` 重合，随后立即进入拖拽。
- 创建后默认选中新 linker，符合“用户下一步通常继续调线”的预期。

结束态：
- 误触：回滚事务，不留下临时对象。
- 自由落点：提交事务，保留未绑定的 `to` 端。
- 成功连接：提交事务，并把选区切到新 linker。

---

## 6. 本文保留的价值

这份文档现在只回答三个问题：
- 快捷建线为什么是上下文 overlay，而不是全局工具切换。
- 它为什么必须复用 `createLinkerDrag + history.transaction` 主链路。
- 起点选择、事务边界、结束态应遵守什么约定。

具体当前进展、测试覆盖和下一步排期，统一以 `PROJECT_OVERVIEW.md` 与 `ROADMAP.md` 为准。

# Diagen 近期开发计划（以补齐编辑器核心能力为最高优先级）

日期：2026-03-26  
计划类型：滚动计划（优先覆盖未来 4-6 周）  
计划目标：在不破坏现有分层（`core / renderer / primitives / components / ui`）的前提下，优先把编辑器核心能力补齐到“可连续使用、可回归验证、可继续扩展”的状态。`UI` 壳层与通用组件继续推进，但不再占用最高优先级。

---

## 0. 当前判断

### 0.1 当前结论
1. 项目当前最重要的问题，不是“缺少更多壳层组件”，而是“编辑器主流程还没有完全成为一等能力”。
2. 后续开发的最高优先级统一调整为：`编辑器核心能力 > 稳定性与回归 > 壳层 UI/通用组件 > 产品化扩展`。
3. 所有新工作默认先服务于以下闭环：
   - 选择
   - 拖拽
   - 缩放与导航
   - 建块
   - 建线
   - 编辑已有线
   - 撤销重做
   - 剪贴板

### 0.2 现状摘要（2026-03-26）
已具备：
1. `core` 已具备 `tool manager`、`history manager`、`selection manager`、`view manager` 等基础管理器。
2. `renderer` 已具备三层渲染契约：
   - `world-layer`
   - `scene-layer`
   - `overlay-layer`
3. shape / linker 正式创建链路已接入主交互链。
4. 路由、line jumps、anchors、guide 等基础能力已有一部分实现与测试。
5. playground 已能承载 `core + renderer + ui` 联调。

主要缺口：
1. 快捷建线链路尚未形成完整事务闭环。
2. clipboard 仍未完成，是编辑器生产力的关键缺口。
3. 交互回归测试仍偏薄，`renderer` 层缺少足够保护。
4. 视图导航、快捷键、命令入口、连续编辑流仍需统一打磨。
5. 部分知识库条目和阶段描述已经滞后，需要按当前优先级解释项目节奏。

---

## 1. 本阶段总目标与验收标准

### 1.1 总目标
1. 将 Diagen 推进到“基础编辑器核心流程完整可用”的阶段。
2. 核心体验必须不依赖 playground 中的临时按钮或 demo 逻辑才能完成主要编辑操作。
3. 核心交互必须有清晰事务边界，能够稳定进入 `undo / redo`。
4. `renderer` 与 `core` 的职责边界保持清晰，不因赶工把应用逻辑写回底层。

### 1.2 阶段验收标准
满足以下条件时，可认为本阶段主目标达成：
1. 用户可以稳定完成“创建图元 -> 连接 -> 调整 -> 复制粘贴 -> 撤销重做”的连续流程。
2. 快捷建线、已有线拖拽编辑、工具态创建三条链路不互相打架。
3. 关键交互在缩放、滚动、单选、多选场景下行为一致。
4. `renderer` 关键路径具备最小回归测试集。
5. playground 可以作为正式联调入口，而不是仅用于展示静态效果。

---

## 2. 优先级原则

### 2.1 优先级顺序
1. P0：编辑器核心能力
2. P0：交互稳定性、事务一致性、回归测试
3. P1：设计器壳层接线与命令入口
4. P2：通用组件扩展与样式体系
5. P3：评论、导出、协作等产品化能力

### 2.2 执行约束
1. 若 P0 主链路仍未完成，不并行开启新的 P2/P3 能力开发。
2. `components` 新增组件必须优先证明对编辑器主流程有直接价值。
3. `ui` 只负责桥接与壳层装配，不承载图形几何与历史事务逻辑。
4. `renderer` 只处理交互与可视化，不回卷到应用菜单编排。

---

## 3. 核心主线拆解

### 3.1 主线 A：创建与连线
目标：让“建块 + 建线 + 编辑线”成为稳定的一等交互能力。

必做项：
1. 完成 `createLinkerDrag.startCreateFromShape(...)` 的事务闭环。
2. 完成 `InteractionMachine.startQuickCreateLinker(...)` 收口。
3. 完成 `LinkCreateOverlay` 或等价快捷入口的稳定接线。
4. 统一新建线、编辑已有线、工具态建线的结束/取消规则。
5. 补齐命中 shape、命中空白、阈值内取消、阈值外提交等回归测试。

完成标志：
1. 快捷建线不产生孤儿 linker。
2. 一次建线只生成一个 undo 单元。
3. 取消操作不会留下脏状态。
4. 缩放后建线起点与终点仍稳定。

### 3.2 主线 B：选择、拖拽、缩放与导航
目标：把高频编辑基础动作做稳，而不是只追求新功能。

必做项：
1. 复核单选、多选、框选与选择态切换行为。
2. 打磨 shape 拖拽、group 拖拽、resize、rotate 的一致性。
3. 补齐缩放、滚动、fit、居中选中、视口重置等视图命令。
4. 清理 `RendererContainer` 与 `InteractionOverlay` 的职责边界。
5. 为坐标归一化、滚动容器、overlay 定位补最小回归验证。

完成标志：
1. 拖拽、框选、旋转、缩放在 10-15 分钟连续操作下无明显异常。
2. 视图命令不会破坏当前交互会话。
3. overlay 与 scene 坐标在不同 zoom 下保持一致。

### 3.3 主线 C：撤销重做与剪贴板
目标：补齐真正影响生产力的编辑器命令系统。

必做项：
1. 完成 clipboard manager 的模型、序列化和 ID 重映射。
2. 接通 `copy / cut / paste / duplicate`。
3. 将 clipboard 操作完整纳入 `history.transaction`。
4. 补齐 group / linker 引用关系保持与降级策略。
5. 在 playground 或壳层接入快捷键与命令入口。

完成标志：
1. 多选复制可正确粘贴。
2. group 结构与 linker 引用关系可用。
3. `undo / redo` 粒度符合用户预期。

### 3.4 主线 D：命令入口与最小壳层闭环
目标：让核心能力有稳定入口，但不让壳层工作反客为主。

必做项：
1. 明确 `Toolbar / Sidebar / 快捷键 / 右键菜单` 的命令边界。
2. 将创建、删除、复制、分组、缩放等高频命令映射到统一入口。
3. 继续使用 bridge 思路，不把 `Designer` 语义直接塞进基础组件。
4. playground 保持最小但完整的编辑壳层。

完成标志：
1. 主流程命令不再依赖临时按钮。
2. `ui` 可以稳定承载编辑命令映射，但不拥有底层状态。

---

## 4. 分阶段执行计划

## Phase 0：基线稳定（本周立即执行）
目标：先把“可持续迭代”建立起来，再继续堆功能。

任务：
1. 清理全仓已知类型噪音，至少保证核心开发路径不被无关错误干扰。
2. 复核 `RendererContainer`、`InteractionOverlay`、`LinkCreateOverlay` 当前脏改动与计划方向的一致性。
3. 为 `renderer` 关键交互补第一批测试骨架。
4. 确认 playground 为当前唯一集成验证入口。

产出：
1. 稳定的开发基线。
2. 可持续补功能的测试入口。

## Phase 1：创建与连线闭环
目标：先把最容易影响“能不能用”的部分做通。

任务：
1. 完成快捷建线 `Phase 2 -> Phase 4`：
   - `createLinkerDrag.startCreateFromShape(...)`
   - `InteractionMachine.startQuickCreateLinker(...)`
   - overlay 触发入口
2. 统一 linker 新建、编辑、取消、提交的事务边界。
3. 补齐对应测试。

产出：
1. 可正式使用的建线链路。
2. 与现有 linker 编辑链兼容的交互模型。

## Phase 2：选择/拖拽/导航稳态化
目标：把基础编辑动作打磨到连续可用。

任务：
1. 选择、框选、拖拽、resize、rotate 回归清理。
2. guide 与吸附反馈再校准。
3. 补齐 zoom / fit / focus selection / scroll 协同命令。
4. 修复 overlay 定位与缩放坐标偏差。

产出：
1. 稳定的高频编辑体验。
2. 可回归验证的导航与操作闭环。

## Phase 3：剪贴板与历史系统
目标：补齐编辑器生产力能力。

任务：
1. 实现 clipboard manager。
2. 接入 copy / cut / paste / duplicate。
3. 保证与 group / linker / history 的一致性。
4. 建立对应单元测试和 playground 验证场景。

产出：
1. 可用的剪贴板系统。
2. 成熟的事务边界约束。

## Phase 4：命令壳层与最小产品化
目标：把核心能力通过稳定入口暴露出来。

任务：
1. 给高频命令建立快捷键与壳层入口。
2. 整理 `Toolbar / Sidebar / ContextMenu` 的接线优先级。
3. 清理仅为 demo 服务的临时逻辑。
4. 整理文档、示例和已知限制。

产出：
1. 最小但完整的编辑器壳层。
2. 可继续扩展的命令体系。

---

## 5. 未来 4 周建议节奏

### Week 1
1. 处理基线问题与 `renderer` 测试入口。
2. 完成快捷建线 transaction 闭环。
3. 让 `LinkCreateOverlay` 或等价快捷入口接上正式链路。

### Week 2
1. 清理建线回归问题。
2. 打磨选择、拖拽、缩放、overlay 定位。
3. 补齐第一轮交互回归测试。

### Week 3
1. 实现 clipboard manager。
2. 接入 copy / cut / paste / duplicate。
3. 覆盖 group / linker / history 场景。

### Week 4
1. 统一命令入口和快捷键。
2. 用 playground 验证完整编辑主流程。
3. 归档文档，形成下一轮 backlog。

---

## 6. 关键任务清单（按优先级）

### P0：立即执行
1. `packages/renderer/src/primitives/createLinkerDrag.ts`
   - 完成 `startCreateFromShape(...)`
2. `packages/renderer/src/primitives/createInteractionMachine.ts`
   - 完成 `startQuickCreateLinker(...)`
3. `packages/renderer/src/components/LinkCreateOverlay.tsx`
   - 接入正式快捷建线入口，而不是临时行为
4. `packages/renderer/src/components/RendererContainer.tsx`
   - 继续统一视图/输入/会话边界
5. `packages/renderer/src/components/InteractionOverlay.tsx`
   - 清理 overlay 组合边界，避免交互逻辑分散

### P0：紧随其后
1. clipboard manager
2. 交互回归测试
3. 视图命令与快捷键

### P1
1. `Toolbar / Sidebar / ContextMenu` 的命令映射
2. 通用组件补充，但必须服务主流程

### P2
1. 评论
2. 导出
3. 协作预研

---

## 7. 风险与缓解

1. 风险：为了赶进度，把应用命令直接写进 `renderer`。  
缓解：所有图语义写操作优先落在 `core` manager / command 边界。

2. 风险：创建与编辑已有 linker 形成两套并行实现。  
缓解：所有 linker 拖拽统一复用 `createLinkerDrag` 主链路。

3. 风险：回归测试跟不上，导致每次修交互都会破别处。  
缓解：每补一个核心链路，就同步补最小可验证测试，不欠账到最后。

4. 风险：UI 壳层继续挤占核心能力开发时间。  
缓解：所有 `components / ui` 需求先问一句“是否直接改善编辑主流程”，否则降级优先级。

---

## 8. 测试策略

### 8.1 必做单元测试
1. anchors：起点决策与回退规则
2. tool：工具态切换与退出
3. history：transaction 提交/取消
4. clipboard：ID 重映射、group 保真、linker 降级
5. renderer primitives：新建线、取消、提交、命中目标

### 8.2 必做集成回归
1. 创建 shape -> 创建 linker -> undo -> redo
2. 单选/多选 -> 拖拽 -> 缩放 -> 再次编辑
3. copy -> paste -> move -> undo -> redo
4. 不同 zoom 下 overlay 与 pointer 坐标一致性

### 8.3 手工验证
1. 在 playground 连续编辑 10-15 分钟
2. 覆盖中高密度图场景
3. 记录已知问题并归档到下一轮 backlog

---

## 9. 非当前优先级事项

以下工作可以继续记录，但默认不抢占当前主线：
1. 更多通用导航组件
2. 评论系统
3. 导出高级选项
4. 协作协议
5. 完整主题系统

---

## 10. 维护规则

1. 本文是近期执行基线，按周滚动更新。
2. 若编辑器核心链路未完成，不提升外围 UI 事项优先级。
3. 每次计划调整，必须同步更新 `AI_KB/README.md` 的“当前版本要点”和本文日期。

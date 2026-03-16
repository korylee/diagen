# Diagen 执行前就绪审查（2026-03-16）

目的：在执行 `AI_KB/ROADMAP_2W_2026-03-13.md` 前，完成最后一轮代码就绪检查，冻结开工边界与阻塞项。

---

## 1. 结论总览

1. 可直接开工：
- 历史事务机制、交互状态机、overlay 分层、坐标归一化均已具备。

2. 必须先补（P0）：
- shape move/resize Guide（吸附线与吸附偏移）。
- Clipboard manager（copy/cut/paste/duplicate）。
- Router 主链路接入与 `lineJumps` 渲染闭环。

3. 当前主要风险：
- 交互测试覆盖薄弱（仅 `core/utils` 为主）。
- 本机环境无 `node/pnpm/npx`，暂无法在当前终端直接执行自动化测试。

### PR-1 落地状态（2026-03-16）
1. 已完成：历史事件类型补全（`history:execute/history:clear`）。
2. 已完成：路由统一入口已收敛为 `calculateLinkerRoute`（支持 `basic/obstacle` 分发）。
3. 待处理：恢复 Node 工具链后执行单测回归。

---

## 2. 与计划主线的代码对照

### 2.1 Guide（拖拽/缩放吸附线）

现状（已有）：
1. 拖拽入口：`packages/renderer/src/primitives/createShapeDrag.ts`
2. 缩放入口：`packages/renderer/src/primitives/createResize.ts`
3. 交互编排：`packages/renderer/src/primitives/createInteractionMachine.ts`
4. Overlay 容器：`packages/renderer/src/components/InteractionOverlay.tsx`

缺口（未有）：
1. 无统一 Guide 计算模块（候选线收集、阈值吸附、方向约束）。
2. 无 Guide 可视化层（仅 selection/anchor/linker overlay）。

冻结建议：
1. 在 `core` 新增纯计算模块（不依赖 DOM），输出：
- `snapDelta: { x: number; y: number }`
- `guides: Array<{ axis: 'x' | 'y'; pos: number; from: number; to: number }>`
2. `renderer` 仅消费 `guides` 并在 overlay 绘制，不在交互 handler 内写几何算法。

### 2.2 Clipboard（复制/剪切/粘贴/重复）

现状（已有）：
1. 元素管理/历史/选择均已存在：`packages/core/src/designer/managers/*`
2. 具备 group 信息基础：`group` 字段与 `group/ungroup` 操作。

缺口（未有）：
1. 无 `clipboard manager`。
2. 键盘仅绑定了 `delete/ctrl+a/ctrl+z/ctrl+y`，无 `ctrl+c/x/v/d`。

冻结建议：
1. 在 `core` 新增 `clipboard` manager，并挂载到 `createDesigner`。
2. 粘贴流程必须通过 `history.transaction.createScope`，保证“一次粘贴 = 一个撤销单元”。
3. 复制集合默认先执行“按 group 展开”再序列化，避免半组复制破坏结构关系。

### 2.3 Router 主链路与 lineJumps

现状（已有）：
1. Router 算法库在：`packages/core/src/utils/router/*`
2. `lineJumps` 字段在模型层：`packages/core/src/model/page.ts`

缺口（未有）：
1. `view.getLinkerLayout` 当前调用统一入口 `calculateLinkerRoute`（当前策略为 `basic`）：
- `packages/core/src/designer/managers/view.ts`
2. `renderLinker` 尚未使用 `lineJumps` 信息：
- `packages/renderer/src/utils/render-utils.ts`

冻结建议：
1. 在 `view` 增加路由策略入口（默认保留当前策略兜底）。
2. `renderLinker` 接收 `lineJumps` 配置，先做可开关最小实现，再迭代视觉细节。

---

## 3. 跨模块阻塞项（D1 必须冻结）

1. 历史事件契约不完整：
- 已完成：`HistoryEvents` 已补齐 `history:execute/history:clear`。
- 后续建议：新增事件时同步更新 `HistoryEvents`，避免类型与运行时漂移。

2. 路由策略入口命名已冻结（已完成）：
- 主链路与障碍规避统一入口：`utils/router/index.ts` 的 `calculateLinkerRoute`（统一分发）。

3. 测试执行环境缺失：
- 当前终端不可用 `node/pnpm/npx`。
- 建议：开工前先恢复 Node 工具链，否则 D5/D9 验收无法自动化闭环。

---

## 4. 建议的首批 PR 切分（可直接执行）

1. PR-1（基础契约）：
- 历史事件类型补全。
- 路由主入口命名冻结与文档同步。

2. PR-2（Guide Core）：
- Guide 计算纯函数 + 单测（move/resize）。

3. PR-3（Guide Renderer）：
- Overlay Guide 渲染 + createShapeDrag/createResize 接线。

4. PR-4（Clipboard Core）：
- copy/cut/paste/duplicate + ID 重映射 + group/linker 关系处理 + 单测。

5. PR-5（Clipboard UI 接入）：
- 快捷键绑定与命令入口，事务化回归。

6. PR-6（Router/lineJumps）：
- Router 接入 `view` 主链路。
- `lineJumps` 开关接入渲染层。

---

## 5. 执行前检查清单（开工门槛）

1. 代码门槛：
- [ ] D1 接口草案评审完成（Guide/Clipboard/Router）
- [ ] 历史事件类型冻结
- [ ] 路由主入口冻结

2. 环境门槛：
- [ ] `node -v` 可用
- [ ] `pnpm -v` 可用
- [ ] `pnpm run test:unit` 可执行

3. 验收门槛：
- [ ] 每个 PR 都有最小回归用例
- [ ] Playground 提供对应操作脚本（用于手工验收）

---

## 6. 与 `.processon` / draw.io 对照的一致性说明

1. `.processon` 借鉴点：
- `snapLine/snapResizeLine`、clipboard 语义、undo/redo 事件联动。

2. draw.io/mxGraph 借鉴点：
- View/Model/Handler/Overlay/Undo 边界。

3. Diagen 落地原则：
- 迁移机制，不迁移单体实现；
- 算法在 core，反馈在 overlay，命令进入 history 事务。

# LinkerEndpoint 重构方案

## 1. 当前结论

`LinkerEndpoint` 已切换到“**目标对象合入 binding**”的正式方向，不再保留顶层 `id`。

当前正式模型方向：

```ts
type EndpointTarget =
  | { kind: 'element'; id: string }
  | { kind: 'port'; ownerId: string; portId: string }

type LinkerEndpointBinding =
  | { type: 'free' }
  | { type: 'fixed'; target: EndpointTarget; anchorId: string }
  | { type: 'perimeter'; target: EndpointTarget; pathIndex: number; segmentIndex: number; t: number }

interface LinkerEndpoint {
  x: number
  y: number
  binding: LinkerEndpointBinding
  angle?: number
}
```

当前判断：

- 这是比“顶层 `id + binding`”更清晰的正式模型。
- `free + id` 这类模糊状态已被协议层消除。
- `element / port` 两类目标都已预留正式扩展入口。

## 2. 当前问题

### 2.1 当前仍存在的限制

- `fixed / perimeter` 虽然已经带 `target`，但当前正式实现仍主要只支持 `target.kind === 'element'` 且目标是 `shape`
- `port` 目标已进入协议，但尚未进入正式交互主链路
- `x / y / angle` 在绑定态下仍兼具回退值与运行时几何缓存语义

### 2.2 当前最需要继续收口的点

- 明确 `port` 目标进入主链路前的 fallback 规则
- 避免在新代码里把 `binding.target.kind === 'element'` 直接等价理解成 `shape`
- 补齐更多 `binding.target` 协议的行为测试

## 3. 设计目标

本次方案的目标不是立刻改代码，而是先确定正式演进方向：

1. 不把当前实现限制固化成长期模型。
2. 先分清“目标对象”和“附着方式”的职责边界。
3. 允许未来扩展到非 `shape` 目标，而不推翻整个端点模型。
4. 保持现有拖拽、路由、历史、剪贴板主链路可平滑迁移。

## 4. 非目标

当前阶段先不做：

- 为 `port` 增加正式交互与渲染能力
- 为未知目标类型继续扩更多 `kind`
- 一次性重构所有 renderer / overlay / UI 依赖点
- 提前引入 `dynamic / constraint` 等更重语义

## 5. 备选方案评估

### 方案 A：`id -> shapeId`

优点：

- 对当前实现更直观
- 代码阅读时更容易理解当前链路

问题：

- 会把模型强绑定到 `shape`
- 若后续支持其他目标类型，需要再次重构
- 当前收益主要是命名层，不足以覆盖全链路改动成本

结论：

- **已淘汰**

### 方案 B：保留 `id`，先补正式语义和消费点约束

优点：

- 成本最低
- 不破坏当前数据结构
- 能先把“实现里默认 shape”收口成局部假设
- 为后续升级到更泛化 `target` 结构留余地

问题：

- 模型本身仍然偏旧
- `free + id` 歧义始终存在
- 顶层 `id` 和 `binding` 容易出现双事实源

结论：

- **已完成过渡探索，但不再作为正式方向**

### 方案 C：直接升级成 `binding.target`

示意：

```ts
type EndpointTarget =
  | { kind: 'element'; id: string }
  | { kind: 'port'; ownerId: string; portId: string }

type LinkerEndpointBinding =
  | { type: 'free' }
  | { type: 'fixed'; target: EndpointTarget; anchorId: string }
  | { type: 'perimeter'; target: EndpointTarget; pathIndex: number; segmentIndex: number; t: number }
```

优点：

- 目标对象语义最清楚
- 更适合承载未来扩展
- 消除了 `free + id`
- 不再有顶层 `id` 与 `binding` 的双来源

问题：

- 需要同步 `route / drag / clipboard / indexes / tests`
- `port` 进入协议后，后续必须明确其主链路行为

结论：

- **当前正式主方案**

## 6. 推荐实施路径

### 6.1 第一阶段：完成协议升级与核心主链路迁移

目标：

- 把目标对象合入 `binding.target`
- 消除 `free + id` 歧义
- 完成 `route / drag / clipboard / indexes` 的核心迁移

当前已完成：

- `packages/core/src/model/linker.ts`
- `packages/core/src/route/linkerRoute.ts`
- `packages/core/src/designer/managers/clipboard.ts`
- `packages/core/src/designer/managers/element/indexes.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`
- 对应核心测试已补齐并通过

### 6.2 当前兼容口径

- `binding.type === 'free'` 不再带目标对象
- `binding.type !== 'free'` 必须带 `target`
- 当前正式行为仍只保证 `target.kind === 'element'` 且目标为 `shape` 的主链路
- `target.kind === 'port'` 当前允许出现在协议中，但消费点默认回退到保守行为

### 6.3 第二阶段：让 `port` 真正进入主链路

触发条件：

- 真正出现 `port` 级连接需求
- renderer / overlay / hitTest / route 需要理解 `port`
- clipboard / history / serialization 需要定义 `port` 的正式兼容口径

## 7. 对现有链路的影响优先级

### 高优先级

- `packages/core/src/route/linkerRoute.ts`
- `packages/renderer/src/scene/pointer/linker/createLinkerDrag.ts`

原因：

- 这两处直接决定端点附着与重连主链路
- 也是 `target.kind` 分支最集中的地方

### 中优先级

- `packages/core/src/designer/managers/clipboard.ts`
- `packages/core/src/designer/managers/element/indexes.ts`
- `packages/core/src/anchors/`

原因：

- 主要负责复制、关联查询、锚点解析
- 已完成 element 目标迁移，但未来 `port` 仍需单独补口径

### 低优先级

- renderer 集成测试
- overlay/UI 层消费点
- 文档与宿主示例

原因：

- 这些适合在第一阶段语义收口后顺带统一

## 8. 验证建议

当前阶段至少回归：

1. 从 shape 起链、自由起链、端点重连
2. fixed / perimeter 端点 undo / redo
3. clipboard 复制后端点引用与 binding 保持一致
4. `view` 和 `element indexes` 仍能正确回答相关连线

后续若让 `port` 进入正式主链路，需要额外补：

1. `port` 目标的 route / drag / clipboard / hitTest 测试
2. 非 `shape` element` 目标的 fallback 测试
3. serialization / history 的兼容测试

## 9. 当前建议执行顺序

1. 继续清理 renderer 集成测试与 UI 层旧口径
2. 明确 `port` 进入主链路前的 fallback 规则
3. 等真实 `port` 连接需求落地后，再进入第二阶段实现

一句话总结：

`LinkerEndpoint` 现在已经从“顶层 `id` + `binding`”升级成“`binding.target` + 几何字段”，当前最值得继续做的是把这套协议在更多消费点里收口干净，而不是再发明新的中间抽象。

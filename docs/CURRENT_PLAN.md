# 当前计划实施指引

当前执行阶段：Phase4 — 属性编辑面板优先

目标：让选中元素后能直接编辑颜色、线宽、字体等样式字段，一次补齐"批量样式应用 + 默认样式编辑"两块能力，对标 draw.io 右侧格式面板。

## 1. 为什么从"属性面板"切入

之前的计划按"补 action → 补测试 → 补默认样式入口"线性推进，但当前最扎眼的缺口不是缺某个 toolbar 按钮，而是**选中元素后你根本改不了它的颜色、线宽、字体**。

Diagen 的写链路早已就绪：

- `edit.update` 具备事务化单元素 / 多元素写入
- `lineStyle / fillStyle / fontStyle / shapeStyle` 模型字段完备
- Schema 层有 `setDefaultLineStyle / setDefaultFillStyle / setDefaultFontStyle` 注册入口
- 右键菜单、toolbar、sidebar bridge 模式已稳定，可作为面板接线的参考模板

属性面板会自然覆盖：

| 计划原目标 | 面板如何覆盖 |
|-----------|-------------|
| 批量样式应用 | 多选时面板显示混合值，修改即批量写入，单 history entry |
| 默认样式编辑 | 面板底部"保存为默认样式"→ Schema API |
| navigation 收尾 | `actual-size` 顺便补，不值得单独排期 |
| 样式 / history 一致性 | 所有修改走 `edit.update`，天然单事务 |

## 2. 面板设计概要

### 2.1 位置与交互

- 参照 draw.io：右侧固定面板，选中元素时显示，取消选中时隐藏 / 置灰
- 编辑行为：修改即时生效（onChange commit），不走"确认 / 取消"弹窗
- 多选行为：字段值不一致时显示"混合"态；用户修改后写入全部选中元素

### 2.2 字段范围

首版先做最直接影响外观的字段，不追求大而全：

**Line（边框）**
- `lineWidth`：线宽（number）
- `lineColor`：颜色（string，hex/rgb）
- `lineStyle`：线型（solid / dashed / dotted）
- `beginArrowStyle` / `endArrowStyle`：箭头（仅 linker 显示）

**Fill（填充）**
- `fillType`：填充类型（none / solid / gradient）
- `fillColor`：颜色（fillType=solid 时显示）

**Font（字体）**
- `fontFamily`：字体
- `fontSize`：字号
- `fontColor`：颜色
- `bold` / `italic` / `underline`：样式开关
- `textAlign`：水平对齐

**暂不做**：shapeStyle（透明度 / 阴影 / 圆角）、gradient 细节、link 超链接编辑

### 2.3 与"默认样式"的关系

面板底部加一个"Set as default"按钮（或图钉 icon）：

- 点击后调 Schema API 将当前选中元素的样式注册为对应类型默认值
- 新建 shape / linker 时自动继承
- 不额外引入"主题管理"面板——Schema 就是事实源

## 3. 推荐的实现顺序

### Step 1：属性面板 UI 骨架 + 单元素编辑

**目标**：选中一个 shape 后，右侧面板可修改 lineColor / fillColor / fontSize，即时生效。

**文件**（新建）：
- `packages/ui/src/inspector/InspectorPanel.tsx` — 面板容器
- `packages/ui/src/inspector/InspectorBridge.ts` — 读选中元素、生成字段状态、调用 edit
- `packages/ui/src/inspector/fields/` — 各字段控件（ColorField / NumberField / SelectField / ToggleField）

**关键约束**：
- 面板通过 `useDesignerContext()` 获取 `designer`，不引入新的全局状态
- 每个字段的 onChange 直接 `edit.update(elementId, { lineStyle: { lineColor: newColor } })`
- 复用现有 `nested setter` 语义做深层字段局部更新

**验收**：
- 选中一个 shape → 面板显示当前 lineColor / fillColor / fontSize
- 修改颜色 → canvas 即时刷新
- undo → 颜色回退

### Step 2：多元素批量编辑

**目标**：选中多个元素时，面板不消失，修改后全部选中元素一起变更。

**核心逻辑**（在 Bridge 中）：
- 所有选中元素的某字段值相同时 → 正常显示
- 不同时 → 显示"混合"态（input 显示 `—` 或 placeholder "Mixed"）
- 用户修改 → `edit.update()` 对每个选中元素执行（合并为一个 transaction，单 undo entry）

**验收**：
- 选中两个不同颜色的 shape → 颜色字段显示混合态
- 修改为红色 → 两个 shape 都变红
- undo → 一次回退两个

### Step 3：默认样式 Set as default

**目标**：面板底部按钮将当前选中元素的样式注册为默认值。

**行为**：
- 选中单个 shape → 按钮可用 → 点击后将当前 lineStyle / fillStyle / fontStyle 写入 Schema
- 多选或空选 → 按钮禁用
- 新建 shape → 自动继承新默认值

**验收**：
- 修改一个 shape 为红色填充 → Set as default → 新建 shape 默认红色填充
- 不污染已有元素的样式

### Step 4：收尾

- 补 `view:actual-size` action（五分钟工作量）
- 补 Inspector 相关测试
- 更新 toolbar / sidebar 默认配置，把面板入口接上
- 评估 minimap 必要性

## 4. 不做的事情

- 不做独立的"主题编辑器"——默认样式 + Schema 是唯一事实源
- 不做 shapeStyle 高级字段（透明度、阴影、圆角）——字段模型在，UI 留给后续
- 不做渐变编辑器——fillType=gradient 占位即可
- 不做"样式复制 / 粘贴格式刷"——值得做，但本阶段先聚焦基础面板
- 不引入新的状态管理库

## 5. 起手文件

**参考模板**（bridge 模式已稳定）：
- `packages/ui/src/toolbar/createToolbarBridge.ts` — 读取 designer、提供 items signal
- `packages/ui/src/editor/contextMenu/createContextMenuBridge.ts` — 读取 defaults、按上下文切换
- `packages/ui/src/sidebar/createSidebarBridge.tsx` — 完整 bridge + 组件模式

**新建核心文件**：
- `packages/ui/src/inspector/InspectorBridge.ts`
- `packages/ui/src/inspector/InspectorPanel.tsx`
- `packages/ui/src/inspector/fields/ColorField.tsx`
- `packages/ui/src/inspector/fields/NumberField.tsx`
- `packages/ui/src/inspector/fields/SelectField.tsx`

**依赖的现有模块**：
- `packages/core/src/designer/managers/edit/index.ts` — `edit.update`
- `packages/core/src/model/shape.ts` — `ShapeElement`
- `packages/core/src/model/linker.ts` — `LinkerElement`
- `packages/core/src/schema/Schema.ts` — 默认样式注册
- `packages/renderer/src/scene/Renderer.tsx` — `useDesignerContext`

## 6. 测试要点

- 单元素修改 → canvas 刷新 + undo/redo
- 多元素批量修改 → 单 history entry
- 混合值显示与编辑
- Set as default → 新建元素继承
- 面板在切换选中 / 取消选中时的显示 / 隐藏逻辑

---

最后更新：2026-04-28

# 项目概览

## 1. 项目定位

- Diagen 是一个基于 SolidJS 的图编辑内核与 UI 组合库。
- 当前主目标已从“补齐基础交互”转向“补齐真正决定可用性的核心编辑能力”，优先级参考 `draw.io / ProcessOn` 的能力差距。
- `.processon/` 仅作为历史参考资料，不属于运行时代码和当前知识库主线。
- 项目当前未对外发布，因此不以兼容旧设计为目标，而以最佳结构设计为目标。

## 2. 技术栈

- TypeScript strict
- SolidJS
- pnpm workspace
- Turbo
- Vite playground
- Vitest

## 3. 包职责

- `@diagen/core`：Diagram 模型、designer 状态、history、edit、selection、group、clipboard、tool、view
- `@diagen/renderer`：Renderer 组件、canvas 渲染、interaction machine、overlay、坐标换算、滚动服务
- `@diagen/primitives`：浏览器能力封装，如 keyboard、event listener、scroll、observer
- `@diagen/shared`：通用类型、对象工具、几何工具、uid、事件器
- `@diagen/icons`：SVG 图标与生成产物
- `@diagen/components`：纯基础 UI 构件
- `@diagen/ui`：toolbar、sidebar、editor 壳层与 `Designer -> UI` bridge

## 4. 当前已完成能力

- `core` 已形成稳定的 manager 分层：`element / edit / selection / history / view / group / clipboard / tool`
- `renderer` 主交互链路已覆盖：框选、shape 拖拽、resize、rotate、create-shape、create-linker、quick-create linker、auto-scroll、auto-grow、context menu 目标识别
- shape / linker 文本编辑已进入正式主链路，具备双击进入、提交/取消、selection/history 协同与定位基础
- `clipboard manager` 已支持 `copy / cut / paste / duplicate`，并保持事务化 history 语义
- `edit manager` 已统一 `patch / setter / nested setter` 的命令快照逻辑
- 容器层级语义已进入正式主链路：`parent / children / container` 的拖入、拖出、跨容器移动、预览反馈与核心 undo/redo 闭环已进入代码与测试
- 连线编辑成熟度阶段已完成：端点重连、控制点编辑、正交线路调整、连线文字定位、line jump 已进入正式能力集合

## 5. 当前主要缺口

- 样式体系与导航能力还没有形成完整产品体验
- 持久化尚未形成完整的宿主接入闭环
- 导入导出尚未接入 UI 动作体系
- 多 page 分页能力尚未正式建模
- UI 层缺少“保存 / 另存 / 导入 / 导出”等产品入口

## 6. 当前阶段与开发路线图

### 长期优先级说明
- 长期优先级见 `docs/CAPABILITY_PRIORITIES.md`
- 当前执行阶段不等于长期排序中的第一项，而是综合已完成阶段、当前代码基础与返工成本后的落点

### 当前阶段：P1 样式体系与导航效率

**阶段切换原因**：
- 容器与层级语义阶段已完成当前阶段验收，不再继续占用主执行阶段。
- 当前最直接影响编辑效率的剩余短板，已经转移到样式操作效率与导航效率。
- 在容器语义稳定之后，默认样式、批量样式应用与导航动作的一致性，已经成为继续接近 `draw.io / ProcessOn` 的下一块核心能力。

**当前目标**：让样式与导航成为正式、高频、稳定的编辑能力

**当前任务**：
1. 收口默认样式与主题 preset 的正式入口
2. 收口选中元素的批量样式应用语义
3. 收口 zoom / fit / actual size / space 平移等导航动作
4. 梳理样式与导航相关 history / action / view 一致性

**实施入口**：见 `docs/CURRENT_PLAN.md`

### 后续阶段

| 优先级 | 阶段 | 关键任务 |
|--------|------|----------|
| P1 | 样式体系与导航效率 | 默认样式、批量应用、主题 preset、space 平移、zoom preset、minimap 评估 |
| P2 | 多 Page 分页 | Diagram 升级为多 page 文件根模型、page manager、最小分页 UI |
| P2 | 正式持久化与导入导出 | serializeDiagram / parseDiagram / loadDiagram、LocalSnapshot、UI 动作入口 |
| P3 | 保存体验与工作流 | dirty 状态、自动保存、恢复提示、未保存变更警告 |

### 范围控制

本阶段不做：协作编辑、评论/批注、服务端同步、多文档管理、非 JSON 导出格式

## 7. 设计约束

- 当前阶段不做向后兼容承诺
- 文档协议调整时，同步修改测试、playground 和 UI 接线，不保留旧入口
- 正式导入导出默认围绕 `Diagram` 本身，不额外增加 `Document` 根层
- 分页语义归 `core`，分页 UI 归应用层
- 若宿主本地恢复需要 `savedAt / view / activePageId` 等附加信息，由宿主快照层承载

## 8. 运行入口

- playground：`playgrounds/vite`
- core 工厂：`packages/core/src/designer/create.ts`
- renderer 入口：`packages/renderer/src/scene/Renderer.tsx`
- UI 编辑器壳层：`packages/ui/src/editor/Editor.tsx`

## 9. 测试计划要点

当前阶段必须新增：
- 默认样式与批量样式应用测试
- 样式与 history 组合语义测试
- 导航动作与 view 一致性测试
- renderer 集成级导航回归测试

后续阶段再补：
- 样式批量应用与导航效率测试
- page 切换、新建、删除、重命名的 `core` 语义测试
- `serializeDiagram -> parseDiagram -> loadDiagram` 往返测试
- 自动保存与导入后状态清理测试

---

最后更新：2026-04-17

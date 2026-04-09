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
- `@diagen/core`
  - Diagram 模型、designer 状态、history、edit、selection、group、clipboard、tool、view
- `@diagen/renderer`
  - Renderer 组件、canvas 渲染、interaction machine、overlay、坐标换算、自动滚动
- `@diagen/primitives`
  - 浏览器能力封装，如 keyboard、event listener、scroll、observer
- `@diagen/shared`
  - 通用类型、对象工具、几何工具、uid、事件器
- `@diagen/icons`
  - SVG 图标与生成产物
- `@diagen/components`
  - 纯基础 UI 构件
- `@diagen/ui`
  - toolbar、sidebar、editor 壳层与 `Designer -> UI` bridge

## 4. 当前已完成能力
- `core` 已形成稳定的 manager 分层：`element / edit / selection / history / view / group / clipboard / tool`
- `renderer` 主交互链路已覆盖：
  - 框选
  - shape 拖拽
  - resize
  - rotate
  - create-shape
  - create-linker
  - quick-create linker
  - auto-scroll
  - auto-grow
  - context menu 目标识别
- shape / linker 文本编辑已进入正式主链路，具备双击进入、提交/取消、selection/history 协同与定位基础。
- `clipboard manager` 已支持 `copy / cut / paste / duplicate`，并保持事务化 history 语义。
- `edit manager` 已统一 `patch / setter / nested setter` 的命令快照逻辑。
- `renderer` 已有较完整的容器级测试，覆盖键盘快捷键、缩放滚动、建线、快捷建线、拖拽、旋转、吸附线和右键上下文。
- `core` 已有持久化方向的基础实现，但正式协议仍待在多 page 方案稳定后统一收口。

## 5. 当前主要缺口
- 连线编辑成熟度仍不足，尤其是正交线手动调整、控制点生命周期、线路文字正式定位与 line jump 稳定性。
- 容器与层级语义仍弱于 `draw.io / ProcessOn`。
- 样式体系与导航能力还没有形成完整产品体验。
- 持久化尚未形成完整的宿主接入闭环，仍缺自动保存、本地恢复和 UI 状态提示。
- 导入导出尚未接入 UI 动作体系与宿主文件处理链路。
- 多 page 分页能力尚未正式建模；后续需要先在 `core` 定义分页语义，再由应用层补 UI。
- UI 层缺少“保存 / 另存 / 导入 / 导出 / 重置文档”等产品入口。
- `Toolbar` 默认项仍未包含 clipboard 与文档动作。
- playground 仍以内置 sample data 启动，没有接入真实文档恢复流程。

## 5.1 设计约束
- 当前阶段不做向后兼容承诺。
- 文档协议调整时，可以同步修改测试、playground 和 UI 接线，不额外保留旧入口。
- 导入导出优先服务当前正式协议，而不是兼容历史草案格式。
- 正式导入导出默认围绕 `Diagram` 本身，不额外增加 `Document` 根层作为长期协议。
- 若宿主本地恢复需要 `savedAt / view / activePageId` 等附加信息，由宿主快照层承载，不进入 `core` 正式导入导出格式。
- 若后续进入多 page 分页，`Diagram` 直接升级为文件根模型，不额外引入 `Document -> Diagram -> Page` 三层结构。
- 分页语义归 `core`，分页 UI 归应用层。

## 6. 当前优先级
1. 连线编辑成熟度
2. 容器与层级语义
3. 样式体系与导航能力
4. 多 page 分页
5. 正式持久化与导入导出
6. 保存体验与工作流

## 7. 运行入口
- playground：`playgrounds/vite`
- core 工厂：`packages/core/src/designer/create.ts`
- renderer 入口：`packages/renderer/src/components/Renderer/index.tsx`
- UI 编辑器壳层：`packages/ui/src/editor/Editor.tsx`

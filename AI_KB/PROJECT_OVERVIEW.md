# 项目概览

定位：
- 这是一个基于 SolidJS 的在线图形编辑器（面向流程/图表编辑），参考了 ProcessOn 源码（`.processon/`）与 drawio 的思路。
- 仓库为 pnpm monorepo，核心能力拆分为多个独立包。

技术栈与构建：
- 语言：TypeScript
- UI 框架：SolidJS
- 构建与打包：Turbo + tsdown
- 开发调试：Vite（`playgrounds/vite`）
- 测试：Vitest
- 包管理：pnpm（workspace）

核心包（按职责）：
- `@diagen/core`：领域模型 + 设计器状态管理（Designer）+ Schema/Defaults + 几何/坐标工具
- `@diagen/renderer`：Solid 组件与渲染层（Canvas 为主），负责交互接入与视图层
- `@diagen/primitives`：Solid 交互/工具原语（事件、滚动、观察、节流等）
- `@diagen/shared`：通用工具与基础能力（数学、事件、数据结构等）
- `@diagen/ui`：UI 包（当前占位）

当前入口：
- 演示与调试入口位于 `playgrounds/vite`
- 核心 API 入口为 `packages/core/src/designer/index.ts`（`createDesigner`）

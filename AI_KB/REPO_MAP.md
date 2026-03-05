# 仓库结构速览

根目录：
- `.processon/`：参考的 ProcessOn 源码（对照学习用）
- `.turbo/`：Turbo 缓存目录
- `packages/`：核心包集合（monorepo 主体）
- `playgrounds/`：本地开发与调试入口
- `temp/`：临时产物目录
- `package.json`：根脚本与依赖定义
- `pnpm-workspace.yaml`：workspace 配置与依赖版本目录
- `tsconfig.json`：TypeScript 根配置
- `turbo.json`：Turbo 任务与产物配置
- `vitest.config.ts`：单元测试配置

packages/：
- `packages/core/`：核心领域模型与编辑器状态
- `packages/core/src/model/`：Diagram/Shape/Linker/Page 等模型
- `packages/core/src/designer/`：Designer 入口与各类 manager（element/history/selection/view/edit）
- `packages/core/src/schema/`：基础形状与默认值
- `packages/core/src/utils/`：坐标/几何/表达式/路由等通用工具
- `packages/renderer/`：Solid 渲染与交互层
- `packages/renderer/src/components/`：Renderer/Provider/Overlay 等组件
- `packages/renderer/src/canvas/`：Canvas 渲染实现
- `packages/renderer/src/primitives/`：拖拽/缩放/框选/键盘等交互原语
- `packages/renderer/src/theme/`：主题与样式
- `packages/primitives/`：通用 Solid primitives（事件监听、节流、滚动等）
- `packages/shared/`：通用工具库（math/emitter/object/uid 等）
- `packages/ui/`：UI 包（当前占位）

playgrounds/：
- `playgrounds/vite/`：Vite 开发入口（可运行渲染层与核心交互）

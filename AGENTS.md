# Diagen 项目提示词

你正在 `diagen` 项目中工作。这是一个基于 `pnpm` + `Turbo` 的 monorepo，目标是构建一个基于 Solid.js 的图形/流程图设计库。你必须优先遵循项目既有结构、风格与工程约定，而不是套用通用模板。

## 项目理解

1. 项目是一个 diagram / flowchart 设计库，重点是模型、几何、渲染、交互和 UI 之间的协作
2. 目录结构以包为核心：
   - `packages/core`：核心模型与逻辑
   - `packages/shared`：共享工具与类型
   - `packages/primitives`：基础 UI 原语
   - `packages/renderer`：渲染层与场景交互
   - `packages/ui`：上层 UI 组件
   - `playgrounds/vite`：本地调试 playground
3. 改动时要先判断问题属于模型层、几何层、渲染层还是 UI 层，避免职责漂移

## 工程与命令约定

1. 包管理器使用 `pnpm`
2. 构建以 Turbo 驱动
3. 常用命令：
   - `pnpm install`
   - `pnpm run build:packages`
   - `pnpm run watch`
   - `pnpm run test:unit`
   - `pnpm --filter playground-vite dev`

## TypeScript 约束

1. 开启严格模式，新增代码必须保持类型清晰
2. 函数参数与返回值优先显式标注类型
3. 类型导入使用 `import type`
4. 字面量对象在适合时使用 `as const`
5. 不要为了“类型完整性”制造无意义的中间类型

## 代码风格

1. 遵循项目既有 Prettier 风格：
   - 不使用分号
   - 使用单引号
   - 箭头函数参数尽量省略括号
   - 单行宽度约 120
2. 文件名使用 camelCase
3. 类型、接口使用 PascalCase
4. 函数名使用 camelCase，优先动词开头
5. 导出常量遵循项目既有命名习惯
6. JSDoc 和注释使用中文，但只在确有必要时添加

## 导入顺序

1. 外部库
2. 内部包，如 `@diagen/core`、`@diagen/shared`
3. 相对路径导入

## 命名偏好

1. 命名要贴合图形编辑领域语义，但仍然保持简洁
2. 在 `renderer`、`pointer`、`linker`、`drag` 这类上下文中，不要重复把上下文词塞进局部变量名
3. 优先：
   - `point` 而不是 `targetAnchorCalculatedPoint`
   - `anchor` 而不是 `currentHoveredAnchorTarget`
   - `dragState` 而不是 `currentLinkerDragInteractionState`
   - `nextLink` 而不是 `nextComputedLinkElementData`
4. 若函数已位于 `createLinkerDrag.ts` 这类文件中，局部方法名不要再重复 `linker`、`drag`
5. 布尔命名保持短而明确，如 `isLocked`、`hasAnchor`、`canSplit`
6. 除公共导出 API 外，局部变量和私有辅助函数尽量控制在较短命名范围内

## 实现原则

1. 优先在现有结构内修复问题，不轻易新增抽象层
2. 若现有工具函数、几何函数、共享类型可复用，应优先复用
3. 小问题小修，避免顺手做大范围重构
4. 涉及交互逻辑时，同时考虑：
   - 指针状态流转是否清晰
   - 拖拽过程是否可预测
   - 场景更新是否稳定
   - 数据模型与渲染表现是否一致
5. 涉及 geometry / anchors / linker 时，优先保证语义正确性，再考虑抽象优雅性
6. 涉及公共接口时，注意兼容性与后续维护成本

## Solid.js 相关约束

1. 遵循 Solid 的响应式模式，不套用 React 心智模型
2. 优先使用项目已有的响应式组织方式
3. 使用 `createSignal`、`createEffect`、`createMemo` 等模式时，保持最小必要复杂度
4. 控制流优先使用 `Show`、`For`、`Switch/Match`
5. 不引入不符合项目现状的组件组织方式

## 测试与验证

1. 测试框架使用 Vitest
2. 测试描述优先中文，贴合项目风格
3. 修改逻辑后，优先补充或更新相关单测
4. 至少验证以下一项：
   - 相关单元测试
   - 受影响包构建
   - playground 中的交互行为
5. 若未能运行验证，必须明确说明

## 工作方式

1. 先读上下文，再动代码
2. 优先做最小闭环修改
3. 回答时先给结论，再给依据
4. 审查代码时，优先指出真实风险、行为回归和测试缺口
5. 输出要帮助用户快速理解、快速修改、快速确认结果

## 额外硬约束

1. 除非用户明确要求，否则不要为了“更优雅”主动重命名大批已有符号
2. 除非当前改动明确受益，否则不要新增私有辅助函数拆分细碎流程
3. 在交互、拖拽、命中测试相关代码中，优先保证流程连续性与状态清晰度，不为了抽象美观破坏可追踪性
4. 若一个名称已经在当前文件语境中足够清晰，优先保持短命名，不做描述性膨胀

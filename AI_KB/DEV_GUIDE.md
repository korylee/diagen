# 开发与运行

依赖安装：
- 使用 pnpm（根目录有 `packageManager` 约束）
- 安装命令：`pnpm install`

构建与测试（根目录）：
- 构建所有包：`pnpm run build:packages`
- 监听构建：`pnpm run watch`
- 单元测试：`pnpm run test:unit`

本地调试（Vite Playground）：
- 方式一：`pnpm --filter playground-vite dev`
- 方式二：`pnpm -C playgrounds/vite dev`

构建说明：
- Turbo 任务配置：`turbo.json`
- 产物主要位于各包 `dist/` 目录
- `@diagen/core`、`@diagen/shared`、`@diagen/primitives` 使用 `tsdown` 打包

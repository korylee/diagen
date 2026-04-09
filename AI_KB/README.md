# Diagen AI 知识库

目标：
- 提供与当前仓库实现一致的最小必要上下文。
- 优先回答三个问题：现在做到哪、代码主要在哪、下一步做什么。

## 建议阅读顺序
1. `AI_KB/PROJECT_OVERVIEW.md`
2. `AI_KB/REPO_MAP.md`
3. `AI_KB/ARCHITECTURE.md`
4. `AI_KB/DOMAIN_MODEL.md`
5. `AI_KB/CAPABILITY_PRIORITIES.md`
6. `AI_KB/ROADMAP.md`
7. `AI_KB/CURRENT_PLAN.md`
8. `AI_KB/DEV_GUIDE.md`

## 当前结论
- `@diagen/core` 已形成 `element / edit / selection / history / view / group / clipboard / tool` 的编辑器核心能力。
- `@diagen/renderer` 已完成主要交互主链路，包含框选、拖拽、缩放、旋转、建线、快捷建线、自动扩容、自动滚动与 context menu 上下文识别。
- `@diagen/ui` 已提供 toolbar / sidebar / editor 壳层，但仍缺少保存、导入、导出等产品入口。
- 当前后续优先级已调整为先补齐对标 `draw.io / ProcessOn` 的核心编辑能力，再进入 `page + 持久化 + 导入导出`。
- shape / linker 文本编辑最小闭环已完成，当前直接进入实现时，实施入口见 `AI_KB/CURRENT_PLAN.md`。

## 当前设计原则
- 项目尚未对外发布，也没有外部调用方。
- 当前阶段不为旧 API、旧 JSON 格式、旧行为做兼容设计。
- 涉及文档协议、导入导出、状态边界时，优先选择结构最清晰、后续最易维护的方案。
- 如果最佳设计与旧实现冲突，直接重构旧实现，不保留兼容层。

## 当前知识库裁剪原则
- 仅保留对当前开发直接有帮助的文档。
- 删除重复的外部对照、历史设计草案和已失效路径说明。
- 路线图只保留接下来 4 到 8 周的开发计划，不记录长篇背景分析。

## 维护规则
- 包结构、目录入口变化：更新 `REPO_MAP.md`
- 当前能力、优先级、阶段判断变化：更新 `PROJECT_OVERVIEW.md` 和 `ROADMAP.md`
- 当前执行阶段与起手文件变化：更新 `AI_KB/CURRENT_PLAN.md`
- 文档态与运行时边界变化：更新 `ARCHITECTURE.md` 和 `DOMAIN_MODEL.md`
- 调试命令、测试入口变化：更新 `DEV_GUIDE.md`

最后更新：2026-04-09

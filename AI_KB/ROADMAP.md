# Diagen 近期计划

日期：2026-03-27  
范围：未来 2-4 周  
目标：把现有核心交互从“已经可用”推进到“入口完整、可稳定回归”。

---

## 1. 当前判断

已完成：
- shape / linker 创建主链路已接入 `renderer`
- `LinkCreateOverlay` 已可发起快捷建线
- `clipboard manager` 已落地到 `core`
- `rendererTestHarness` 已落地，`RendererContainer` 已有首批容器级测试
- `edit manager` 的整对象字段回退问题已修复

当前缺口：
- `RendererContainer` 仍只绑定 `delete / ctrl+a / esc / ctrl+z / ctrl+y`，`Ctrl/Cmd+C/X/V/D` 尚未接上
- `packages/ui/src/toolbar/createToolbarBridge.ts` 仍未暴露 clipboard 入口
- `LinkCreateOverlay / create-linker / auto-scroll / 更多 zoom-scroll 组合` 的容器级回归仍不足
- 连续操作场景还缺少更多组合验证
- move/resize 通用吸附线仍是下一阶段最明显的体验缺口

优先级：
1. 先补输入入口闭环，再补容器级回归
2. 再做连续编辑稳态化
3. 再进入 move/resize guide line
4. 外围 UI 与产品化扩展继续后置

---

## 2. 近期阶段与建议顺序

### Phase 1：输入入口闭环
目标：把已经存在的 `core` 能力真正暴露到 `renderer + ui`。

任务：
- 在 `packages/renderer/src/components/RendererContainer.tsx` 接入 `Ctrl/Cmd+C/X/V/D`
- 统一处理 `ctrlKey` 与 `metaKey`，避免 macOS 缺口
- 在 `packages/ui/src/toolbar/createToolbarBridge.ts` 暴露 `copy / cut / paste / duplicate`
- 用 `designer.clipboard.canPaste()`、选择数量、`canUndo/canRedo` 驱动 disabled 状态
- 视需要补 `clipboardChanged / undoStackChanged` 一类 UI bridge 观察点，但不把 UI 状态反向塞回 `core`

完成标志：
- 复制粘贴不再只能靠直接调用 `designer.clipboard.*`
- 键盘入口、toolbar 入口、事务粒度三者一致

### Phase 2：补齐 `renderer` 主入口回归
目标：让关键交互不再只靠 playground 手测。

任务：
- 为 `create-linker` 工具态补 `RendererContainer` 测试
- 为 `LinkCreateOverlay` 补显示/触发测试
- 补 `auto-scroll`
- 补更多 `zoom / scroll` 组合场景
- 补 clipboard 快捷键在容器级的集成测试，覆盖 selection/history 结果

完成标志：
- `RendererContainer` 关键输入分支都有最小自动化回归
- 新增交互入口都能在 harness 下稳定复现

### Phase 3：连续编辑稳态化
目标：把高频动作的串联体验做稳。

任务：
- 覆盖 `box select -> drag -> resize -> rotate -> undo/redo`
- 覆盖 `zoom / scroll -> drag|resize|rotate` 的跨模式串联
- 复核缩放、滚动、自动滚动对交互会话的影响
- 补 playground 手工验证清单

完成标志：
- 常见连续编辑流程可稳定回归

### Phase 4：guide line 与编辑效率提升
目标：补齐对齐辅助这一块最明显的体验差距。

任务：
- 为 shape move/resize 抽出 guide 计算入口
- 在 overlay 层呈现 guide line，不污染模型
- 参考 `.processon` 的 `snapLine / snapResizeLine`，但保持 `core 计算 + renderer 呈现` 分层
- 先补最小自动化回归，再考虑视觉细化

完成标志：
- move/resize 具备最小可用吸附反馈
- guide 逻辑不侵入 `Diagram` 文档态

---

## 3. 立即任务

### P0
- `packages/renderer/src/components/RendererContainer.tsx`
  - 接入 `Ctrl/Cmd+C/X/V/D`
  - 统一 `ctrl/meta` 修饰键判断
- `packages/ui/src/toolbar/createToolbarBridge.ts`
  - 补 `copy / cut / paste / duplicate`
  - 补 disabled 条件
- `packages/renderer/src/components/__tests__/RendererContainer.test.ts`
  - 补 clipboard 快捷键、`create-linker`、`auto-scroll`、更多 `zoom / scroll` 回归

### P1
- `packages/renderer/src/components/LinkCreateOverlay.tsx`
  - 补显示条件与触发行为测试
- 选择/拖拽/resize/rotate 跨模式组合验证
- playground 手工验证清单

---

## 4. 测试基线

已具备：
- `createLinkerDrag`
- `createInteractionMachine`
- `clipboardManager`
- `RendererContainer`

下一批必须补：
- clipboard keyboard path
- `create-linker` 主入口
- `LinkCreateOverlay`
- `auto-scroll`
- 更多 `zoom / scroll` 组合
- 连续编辑串联场景

建议测试顺序：
1. clipboard 快捷键
2. `create-linker`
3. `LinkCreateOverlay`
4. `auto-scroll`
5. 连续操作串联

---

## 5. 维护规则
- `ROADMAP.md` 只保留“下一步要做什么”
- 当前状态变化同步到 `PROJECT_OVERVIEW.md`
- 细节设计不回写到路线图里，避免再次膨胀

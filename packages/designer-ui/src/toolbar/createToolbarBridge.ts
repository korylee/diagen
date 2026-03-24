import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'

import type {
  ToolbarBridge,
  ToolbarBridgeButtonItem,
  ToolbarBridgeDividerItem,
  ToolbarBridgeItem,
} from './types'

function createButton(item: Omit<ToolbarBridgeButtonItem, 'kind'>): ToolbarBridgeButtonItem {
  return {
    kind: 'button',
    ...item,
  }
}

function createDivider(id: string, size: 'normal' | 'small' = 'normal'): ToolbarBridgeDividerItem {
  return {
    id,
    kind: 'divider',
    size,
  }
}

export function createToolbarBridge(designer: Designer): ToolbarBridge {
  const selectionCount = createMemo<number>(() => designer.selection.selectedIds().length)
  const selectedGroupCount = createMemo<number>(() => designer.group.getGroupsFromElements(designer.selection.selectedIds()).size)
  const canGroup = createMemo<boolean>(() => selectionCount() > 1)
  const canUngroup = createMemo<boolean>(() => selectedGroupCount() > 0)
  const canDelete = createMemo<boolean>(() => selectionCount() > 0)
  const canUndo = createMemo<boolean>(() => designer.canUndo())
  const canRedo = createMemo<boolean>(() => designer.canRedo())
  const currentTool = createMemo(() => designer.tool.tool())

  const leftItems = createMemo<readonly ToolbarBridgeItem[]>(() => [
    createButton({
      id: 'tool:shape:rectangle',
      text: 'Rectangle',
      title: '创建矩形',
      iconKey: 'shape-rectangle',
      selected: currentTool().type === 'create-shape' && currentTool().shapeId === 'rectangle',
      execute: () => {
        designer.tool.toggleCreateShape('rectangle')
      },
    }),
    createButton({
      id: 'tool:linker:linker',
      text: 'Linker',
      title: '创建连线',
      iconKey: 'linker',
      selected: currentTool().type === 'create-linker' && currentTool().linkerId === 'linker',
      execute: () => {
        designer.tool.toggleCreateLinker('linker')
      },
    }),
    createDivider('divider:tool'),
    createButton({
      id: 'history:undo',
      title: '撤销 (Ctrl+Z)',
      iconKey: 'undo',
      disabled: !canUndo(),
      execute: () => {
        designer.undo()
      },
    }),
    createButton({
      id: 'history:redo',
      title: '重做 (Ctrl+Y)',
      iconKey: 'redo',
      disabled: !canRedo(),
      execute: () => {
        designer.redo()
      },
    }),
    createDivider('divider:edit'),
    createButton({
      id: 'arrange:group',
      title: '分组',
      iconKey: 'group',
      disabled: !canGroup(),
      execute: () => {
        const ids = designer.selection.selectedIds()
        if (ids.length < 2) {
          return
        }

        designer.group.group(ids)
      },
    }),
    createButton({
      id: 'arrange:ungroup',
      title: '解组',
      iconKey: 'ungroup',
      disabled: !canUngroup(),
      execute: () => {
        const groups = designer.group.getGroupsFromElements(designer.selection.selectedIds())
        groups.forEach(groupId => designer.group.ungroup(groupId))
      },
    }),
    createButton({
      id: 'edit:delete',
      title: '删除',
      iconKey: 'delete',
      disabled: !canDelete(),
      execute: () => {
        const ids = designer.selection.selectedIds()
        if (ids.length === 0) {
          return
        }

        designer.removeElements(ids)
      },
    }),
    createDivider('divider:view'),
    createButton({
      id: 'view:zoom-out',
      title: '缩小',
      iconKey: 'zoom-out',
      execute: () => {
        designer.view.zoomOut()
      },
    }),
    createButton({
      id: 'view:fit',
      title: '适应内容',
      iconKey: 'fit',
      execute: () => {
        designer.view.fitToContent()
      },
    }),
    createButton({
      id: 'view:zoom-in',
      title: '放大',
      iconKey: 'zoom-in',
      execute: () => {
        designer.view.zoomIn()
      },
    }),
  ])

  const rightItems = createMemo<readonly ToolbarBridgeItem[]>(() => [])

  function getItemById(id: string): ToolbarBridgeItem | undefined {
    return [...leftItems(), ...rightItems()].find(item => item.id === id)
  }

  function execute(id: string): boolean {
    const item = getItemById(id)

    if (!item || item.kind !== 'button' || item.disabled) {
      return false
    }

    item.execute()
    return true
  }

  return {
    leftItems,
    rightItems,
    getItemById,
    execute,
  }
}

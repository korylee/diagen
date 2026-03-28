import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'

import type { ToolbarBridge, ToolbarBridgeButtonItem, ToolbarBridgeDividerItem, ToolbarBridgeItem } from './types'

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
  const { element, selection, group, history, edit, tool, view } = designer
  const selectedGroups = createMemo(() => group.getGroupsFromElementIds(selection.selectedIds()))
  const selectedGroupCount = createMemo<number>(() => selectedGroups().length)
  const canGroup = createMemo<boolean>(() => selection.selectedCount() > 1)
  const canUngroup = createMemo<boolean>(() => selectedGroupCount() > 0)

  const leftItems = createMemo<readonly ToolbarBridgeItem[]>(() => [
    createButton({
      id: 'history:undo',
      title: '撤销 (Ctrl+Z)',
      iconKey: 'undo',
      disabled: !history.canUndo(),
      execute: () => {
        history.undo()
      },
    }),
    createButton({
      id: 'history:redo',
      title: '重做 (Ctrl+Y)',
      iconKey: 'redo',
      disabled: !history.canRedo(),
      execute: () => {
        history.redo()
      },
    }),
    createDivider('divider:edit'),
    createButton({
      id: 'arrange:group',
      title: '分组',
      iconKey: 'group',
      disabled: !canGroup(),
      execute: () => {
        const ids = selection.selectedIds()
        if (ids.length < 2) {
          return
        }

        group.group(ids)
      },
    }),
    createButton({
      id: 'arrange:ungroup',
      title: '解组',
      iconKey: 'ungroup',
      disabled: !canUngroup(),
      execute: () => {
        const groups = group.getGroupsFromElementIds(selection.selectedIds())
        groups.forEach(groupId => group.ungroup(groupId))
      },
    }),
    createButton({
      id: 'edit:delete',
      title: '删除',
      iconKey: 'delete',
      disabled: selection.isEmpty(),
      execute: () => {
        const ids = selection.selectedIds()
        if (ids.length === 0) {
          return
        }

        edit.remove(ids)
      },
    }),
    createDivider('divider:view'),
    createButton({
      id: 'view:zoom-out',
      title: '缩小',
      iconKey: 'zoom-out',
      execute: () => {
        view.zoomOut()
      },
    }),
    createButton({
      id: 'view:fit',
      title: '适应内容',
      iconKey: 'fit',
      execute: () => {
        view.fitToContent()
      },
    }),
    createButton({
      id: 'view:zoom-in',
      title: '放大',
      iconKey: 'zoom-in',
      execute: () => {
        view.zoomIn()
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

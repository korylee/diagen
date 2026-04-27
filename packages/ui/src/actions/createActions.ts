import { createMemo } from 'solid-js'
import type { Designer } from '@diagen/core'
import type { UIAction, UIActions } from './types'

export function createActions(designer: Designer): UIActions {
  const { selection, clipboard, edit, group, history, view } = designer
  const selectedGroups = createMemo(() => group.getGroupsFromElementIds(selection.selectedIds()))

  const actionMap = new Map<string, UIAction>([
    [
      'clipboard:copy',
      {
        id: 'clipboard:copy',
        label: '复制',
        shortcut: 'Ctrl+C',
        isDisabled: () => selection.isEmpty(),
        execute: () => {
          clipboard.copy(selection.selectedIds())
        },
      },
    ],
    [
      'clipboard:cut',
      {
        id: 'clipboard:cut',
        label: '剪切',
        shortcut: 'Ctrl+X',
        isDisabled: () => selection.isEmpty(),
        execute: () => {
          clipboard.cut(selection.selectedIds())
        },
      },
    ],
    [
      'clipboard:paste',
      {
        id: 'clipboard:paste',
        label: '粘贴',
        shortcut: 'Ctrl+V',
        isDisabled: () => !clipboard.canPaste(),
        execute: () => {
          clipboard.paste()
        },
      },
    ],
    [
      'clipboard:duplicate',
      {
        id: 'clipboard:duplicate',
        label: '复制一份',
        shortcut: 'Ctrl+D',
        isDisabled: () => selection.isEmpty(),
        execute: () => {
          clipboard.duplicate(selection.selectedIds())
        },
      },
    ],
    [
      'arrange:group',
      {
        id: 'arrange:group',
        label: '分组',
        title: '分组',
        icon: 'group',
        isDisabled: () => selection.selectedCount() <= 1,
        execute: () => {
          const ids = selection.selectedIds()
          if (ids.length >= 2) {
            group.group(ids)
          }
        },
      },
    ],
    [
      'arrange:ungroup',
      {
        id: 'arrange:ungroup',
        label: '解组',
        title: '解组',
        icon: 'ungroup',
        isDisabled: () => selectedGroups().length === 0,
        execute: () => {
          selectedGroups().forEach(groupId => group.ungroup(groupId))
        },
      },
    ],
    [
      'edit:delete',
      {
        id: 'edit:delete',
        label: '删除',
        title: '删除',
        icon: 'delete',
        shortcut: 'Delete',
        danger: true,
        isDisabled: () => selection.isEmpty(),
        execute: () => {
          const ids = selection.selectedIds()
          if (ids.length > 0) {
            edit.remove(ids)
          }
        },
      },
    ],
    [
      'history:undo',
      {
        id: 'history:undo',
        label: '撤销',
        title: '撤销',
        icon: 'undo',
        shortcut: 'Ctrl+Z',
        isDisabled: () => !history.canUndo(),
        execute: () => {
          history.undo()
        },
      },
    ],
    [
      'history:redo',
      {
        id: 'history:redo',
        label: '重做',
        title: '重做',
        icon: 'redo',
        shortcut: 'Ctrl+Y',
        isDisabled: () => !history.canRedo(),
        execute: () => {
          history.redo()
        },
      },
    ],
    [
      'view:zoom-out',
      {
        id: 'view:zoom-out',
        label: '缩小',
        title: '缩小',
        icon: 'zoom-out',
        execute: () => {
          view.zoomOut()
        },
      },
    ],
    [
      'view:fit',
      {
        id: 'view:fit',
        label: '适应内容',
        title: '适应内容',
        icon: 'fit',
        execute: () => {
          view.fitToContent()
        },
      },
    ],
    [
      'view:fit-selection',
      {
        id: 'view:fit-selection',
        label: '适应选中',
        title: '适应选中',
        icon: 'fit',
        shortcut: 'Ctrl+Shift+F',
        isDisabled: () => selection.isEmpty(),
        execute: () => {
          view.fitToSelection()
        },
      },
    ],
    [
      'view:zoom-in',
      {
        id: 'view:zoom-in',
        label: '放大',
        title: '放大',
        icon: 'zoom-in',
        execute: () => {
          view.zoomIn()
        },
      },
    ],
  ])

  function getAction(id: string): UIAction | undefined {
    return actionMap.get(id)
  }

  function isDisabled(id: string): boolean {
    return getAction(id)?.isDisabled?.() ?? false
  }

  function execute(id: string): boolean {
    const action = getAction(id)
    if (!action?.execute || isDisabled(id)) {
      return false
    }

    action.execute()
    return true
  }

  return {
    ids: () => Array.from(actionMap.keys()),
    getAction,
    isDisabled,
    execute,
  }
}

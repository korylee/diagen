import { createMemo } from 'solid-js'
import { useDesigner } from '@diagen/renderer'
import { createActions } from '../actions'

import type { ActionEntry } from '../actions'
import type { ToolbarBridge, ToolbarBridgeItem, ToolbarEntries } from './types'

const defaultLeftEntries = ['history:undo', 'history:redo', '|', 'arrange:group', 'arrange:ungroup', 'edit:delete', '|', 'view:zoom-out', 'view:fit', 'view:zoom-in'] as const
const defaultRightEntries = [] as const

function resolveEntries(
  entries: ToolbarEntries['left'] | undefined,
  fallback: readonly ActionEntry[],
) {
  return typeof entries === 'function' ? entries() : (entries ?? fallback)
}

export function createToolbarBridge(entries: ToolbarEntries = {}): ToolbarBridge {
  const designer = useDesigner()
  const actions = createActions(designer)

  const leftItems = createMemo<readonly ToolbarBridgeItem[]>(() =>
    resolveEntries(entries.left, defaultLeftEntries).flatMap(entry => {
      if (entry === '|') {
        return ['|']
      }

      const button = typeof entry === 'string' ? actions.getAction(entry) : entry
      return button ? [button] : []
    }),
  )

  const rightItems = createMemo<readonly ToolbarBridgeItem[]>(() =>
    resolveEntries(entries.right, defaultRightEntries).flatMap(entry => {
      if (entry === '|') {
        return ['|']
      }

      const button = typeof entry === 'string' ? actions.getAction(entry) : entry
      return button ? [button] : []
    }),
  )

  function execute(id: string): boolean {
    return actions.execute(id)
  }

  return {
    leftItems,
    rightItems,
    getAction: actions.getAction,
    execute,
  }
}

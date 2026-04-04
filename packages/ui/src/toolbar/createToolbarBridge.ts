import { createMemo } from 'solid-js'
import { useDesignerContext } from '@diagen/renderer'
import { createActions } from '../actions'
import { useUIActions } from '../config'

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
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))

  const leftItems = createMemo<readonly ToolbarBridgeItem[]>(() =>
    resolveEntries(entries.left, defaultLeftEntries).flatMap(entry => {
      const resolvedActions = actions()
      if (!resolvedActions) {
        return []
      }

      if (entry === '|') {
        return ['|']
      }

      const button = typeof entry === 'string' ? resolvedActions.getAction(entry) : entry
      return button ? [button] : []
    }),
  )

  const rightItems = createMemo<readonly ToolbarBridgeItem[]>(() =>
    resolveEntries(entries.right, defaultRightEntries).flatMap(entry => {
      const resolvedActions = actions()
      if (!resolvedActions) {
        return []
      }

      if (entry === '|') {
        return ['|']
      }

      const button = typeof entry === 'string' ? resolvedActions.getAction(entry) : entry
      return button ? [button] : []
    }),
  )

  function execute(id: string): boolean {
    return actions()?.execute(id) ?? false
  }

  function getAction(id: string) {
    return actions()?.getAction(id)
  }

  return {
    leftItems,
    rightItems,
    getAction,
    execute,
  }
}

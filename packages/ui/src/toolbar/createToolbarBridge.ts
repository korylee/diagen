import { createMemo } from 'solid-js'
import { useDesignerContext } from '@diagen/renderer'
import { createActions } from '../actions'
import { useUIActions } from '../config'

import type { ActionEntry } from '../actions'
import type { ToolbarBridge, ToolbarBridgeItem, ToolbarEntries } from './types'

const defaultEntries: readonly (ActionEntry | 'spacer')[] = [
  'history:undo',
  'history:redo',
  '|',
  'arrange:group',
  'arrange:ungroup',
  'edit:delete',
  '|',
  'view:zoom-out',
  'view:fit',
  'view:zoom-in',
]

export function createToolbarBridge(entries?: ToolbarEntries): ToolbarBridge {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo<readonly ToolbarBridgeItem[]>(() => {
    const resolvedActions = actions()
    const resolvedEntries = typeof entries === 'function' ? entries() : (entries ?? defaultEntries)
    if (!resolvedActions) {
      return []
    }

    return resolvedEntries.flatMap(entry => {
      if (entry === '|' || entry === 'spacer') {
        return [entry]
      }

      const button = typeof entry === 'string' ? resolvedActions.getAction(entry) : entry
      return button ? [button] : []
    })
  })

  function execute(id: string): boolean {
    return actions()?.execute(id) ?? false
  }

  function getAction(id: string) {
    return actions()?.getAction(id)
  }

  return {
    items,
    getAction,
    execute,
  }
}

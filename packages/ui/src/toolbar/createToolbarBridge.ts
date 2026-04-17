import { useDesignerContext } from '@diagen/renderer'
import { createMemo } from 'solid-js'
import { createActions } from '../actions'
import { useUIActions, useUIDefaults } from '../config'

import type { ToolbarBridge, ToolbarBridgeItem, ToolbarEntries } from './types'

export function createToolbarBridge(entries?: ToolbarEntries): ToolbarBridge {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const defaults = useUIDefaults()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo<readonly ToolbarBridgeItem[]>(() => {
    const resolvedActions = actions()
    const resolvedEntries = typeof entries === 'function' ? entries() : (entries ?? defaults().ui.toolbarEntries)
    if (!resolvedActions) {
      return []
    }

    // 显式标注回调返回类型，避免 flatMap 在分支间产生错误的联合类型推断。
    return resolvedEntries.flatMap((entry): readonly ToolbarBridgeItem[] => {
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

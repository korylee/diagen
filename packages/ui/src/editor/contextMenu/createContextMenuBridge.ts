import { useDesignerContext } from '@diagen/renderer'
import { isFunction, isNil } from '@diagen/shared'
import { createMemo, type Accessor } from 'solid-js'
import { createActions } from '../../actions'
import { useUIActions, useUIDefaults } from '../../config'
import { getContextMenuDefaultEntries } from '../../defaults'
import type { ContextMenuBridge, ContextMenuContext, ContextMenuEntries } from './types'

export function createContextMenuBridge(
  context: Accessor<ContextMenuContext>,
  entries?: ContextMenuEntries,
): ContextMenuBridge {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const defaults = useUIDefaults()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo(() => {
    const resolvedActions = actions()
    const resolvedContext = context()
    const resolvedEntries =
      (isFunction(entries) ? entries(resolvedContext) : entries) ??
      getContextMenuDefaultEntries(resolvedContext.targetType, defaults().ui.contextMenuEntries)
    if (!resolvedActions) {
      return []
    }

    return resolvedEntries
      .map(entry => {
        if (entry === '|') return entry

        return typeof entry === 'string' ? resolvedActions.getAction(entry) : entry
      })
      .filter(v => !isNil(v))
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

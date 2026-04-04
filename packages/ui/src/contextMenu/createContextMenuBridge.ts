import { useDesignerContext } from '@diagen/renderer'
import { isFunction, isNil } from '@diagen/shared'
import { createMemo } from 'solid-js'
import type { ActionEntry, ResolveActionEntries } from '../actions'
import { createActions } from '../actions'
import { useUIActions } from '../config'
import type { ContextMenuBridge } from './types'

const defaultEntries: readonly ActionEntry[] = [
  'clipboard:copy',
  'clipboard:cut',
  'clipboard:paste',
  'clipboard:duplicate',
  '|',
  'arrange:group',
  'arrange:ungroup',
  'edit:delete',
  '|',
  'history:undo',
  'history:redo',
  '|',
  'view:fit',
]

export function createContextMenuBridge(entries?: ResolveActionEntries): ContextMenuBridge {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo(() => {
    const resolvedActions = actions()
    const resolvedEntries = (isFunction(entries) ? entries() : entries) ?? defaultEntries
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

import { useDesigner } from '@diagen/renderer'
import { isFunction, isNil } from '@diagen/shared'
import { createMemo } from 'solid-js'
import type { ActionEntry, ResolveActionEntries } from '../actions'
import { createActions } from '../actions'
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
  const designer = useDesigner()
  const actions = createActions(designer)
  const items = createMemo(() => {
    const resolvedEntries = (isFunction(entries) ? entries() : entries) ?? defaultEntries

    return resolvedEntries
      .map(entry => {
        if (entry === '|') return entry

        return typeof entry === 'string' ? actions.getAction(entry) : entry
      })
      .filter(v => !isNil(v))
  })

  function execute(id: string): boolean {
    return actions.execute(id)
  }

  return {
    items,
    getAction: actions.getAction,
    execute,
  }
}

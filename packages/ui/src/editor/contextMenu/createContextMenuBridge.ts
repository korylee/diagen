import { useDesignerContext } from '@diagen/renderer'
import { isFunction, isNil } from '@diagen/shared'
import { createMemo, type Accessor } from 'solid-js'
import { createActions } from '../../actions'
import { useUIActions } from '../../config'
import type { ContextMenuBridge, ContextMenuContext, ContextMenuEntries } from './types'

const defaultCanvasEntries = ['clipboard:paste', '|', 'history:undo', 'history:redo', '|', 'view:fit'] as const
const defaultElementEntries = [
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
] as const
const defaultLinkerEntries = [
  'clipboard:copy',
  'clipboard:cut',
  'clipboard:paste',
  'clipboard:duplicate',
  '|',
  'edit:delete',
  '|',
  'history:undo',
  'history:redo',
  '|',
  'view:fit',
] as const

function getDefaultEntriesByContext(context: ContextMenuContext): readonly string[] {
  if (context.targetType === 'canvas') return defaultCanvasEntries
  if (context.targetType === 'linker') return defaultLinkerEntries
  return defaultElementEntries
}

export function createContextMenuBridge(context: Accessor<ContextMenuContext>, entries?: ContextMenuEntries): ContextMenuBridge {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo(() => {
    const resolvedActions = actions()
    const resolvedContext = context()
    const resolvedEntries = (isFunction(entries) ? entries(resolvedContext) : entries) ?? getDefaultEntriesByContext(resolvedContext)
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

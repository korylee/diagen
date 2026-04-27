import { useDesignerContext } from '@diagen/renderer'
import { isFunction, isNil, isNonNullable } from '@diagen/shared'
import { createMemo, type Accessor } from 'solid-js'
import { createActions, type ActionEntry, type UIAction, type UIActions } from '../../actions'
import { useUIActions, useUIDefaults } from '../../config'
import { getContextMenuDefaultEntries } from '../../defaults'
import type { ContextMenuContext, ContextMenuEntries, ResolvedContextMenuEntry } from './types'

function resolveEntryList(
  entries: readonly (ActionEntry | UIAction)[],
  actions: UIActions,
): ResolvedContextMenuEntry[] {
  return entries
    .map((entry, index): ResolvedContextMenuEntry | null => {
      if (entry === '|') {
        return { type: 'divider', key: `divider:${index}` }
      }

      const action = typeof entry === 'string' ? actions.getAction(entry) : entry
      if (isNil(action)) return null

      return {
        key: action.id,
        label: action.label,
        icon: action.icon,
        disabled: action.isDisabled?.(),
        danger: action.danger,
        extra: action.shortcut,
        ...(action.children?.length ? { children: resolveEntryList(action.children, actions) } : {}),
      }
    })
    .filter(isNonNullable)
}

export function createContextMenuBridge(context: Accessor<ContextMenuContext>, entries?: ContextMenuEntries) {
  const designer = useDesignerContext()
  const configuredActions = useUIActions()
  const defaults = useUIDefaults()
  const actions = createMemo(() => configuredActions() ?? (designer ? createActions(designer) : undefined))
  const items = createMemo<readonly ResolvedContextMenuEntry[]>(() => {
    const resolvedActions = actions()
    if (!resolvedActions) {
      return []
    }

    const resolvedContext = context()
    const resolvedEntries =
      (isFunction(entries) ? entries(resolvedContext) : entries) ??
      getContextMenuDefaultEntries(resolvedContext.targetType, defaults().ui.contextMenu.entries)

    return resolveEntryList(resolvedEntries, resolvedActions)
  })

  function execute(id: string): boolean {
    return actions()?.execute(id) ?? false
  }

  return {
    items,
    execute,
  }
}

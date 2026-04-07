import { Menu, type MenuClickInfo } from '@diagen/components'
import { createEventListener } from '@diagen/primitives'
import type { JSX } from 'solid-js'
import { createMemo, Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'
import { renderIcon } from '../../iconRegistry'
import { useUIIconRegistry } from '../../config'
import { createContextMenuBridge } from './createContextMenuBridge'
import type { ContextMenuEntries, ContextMenuItem, ContextMenuState } from './types'
import { createDgBem } from '@diagen/shared'

import "./index.scss"

export interface ContextMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style' | 'onSelect'> {
  state: ContextMenuState
  onClose?: () => void
  entries?: ContextMenuEntries
  style?: JSX.CSSProperties
  renderIcon?: (icon: string, item: ContextMenuItem) => JSX.Element | undefined
}

const bem = createDgBem('context-menu')

export function ContextMenu(props: ContextMenuProps) {
  const [local, rest] = splitProps(props, ['state', 'onClose', 'renderIcon', 'entries', 'style'])
  // Keep menu item resolution bound to a single state object so
  // open/position/context always move together from the caller side.
  const bridge = createContextMenuBridge(() => local.state.context, local.entries)
  const globalIconRegistry = useUIIconRegistry()
  const renderMenuIcon = (icon: ContextMenuItem['icon'], item: ContextMenuItem) => {
    // Let provider-level icons stay the default source,
    // while renderIcon remains the final escape hatch for callers.
    return typeof icon === 'string'
      ? local.renderIcon
        ? local.renderIcon(icon, item)
        : renderIcon(icon as any, globalIconRegistry())
      : icon?.({})
  }
  const items = createMemo(() =>
    bridge.items().map((item, index) => {
      if (item === '|') {
        return {
          type: 'divider',
          key: `divider:${index}`,
        }
      }
      return {
        key: item.id,
        label: item.label,
        disabled: item.isDisabled?.(),
        extra: item.shortcut,
        danger: item.danger,
        'data-menu-id': item.id,
        icon: renderMenuIcon(item.icon, item),
      }
    }),
  )

  let rootRef: HTMLDivElement | undefined

  const handleDocumentPointerDown = (event: MouseEvent) => {
    if (!local.state.open) return
    const target = event.target as Node | null
    if (rootRef && target && !rootRef.contains(target)) {
      local.onClose?.()
    }
  }

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (!local.state.open) return
    if (event.key === 'Escape') {
      local.onClose?.()
    }
  }

  createEventListener(document, 'mousedown', handleDocumentPointerDown)
  createEventListener(document, 'keydown', handleDocumentKeyDown)

  const handleClick = (info: MenuClickInfo) => {
    if (bridge.execute(info.key)) {
      local.onClose?.()
    }
  }

  return (
    <Show when={local.state.open}>
      <Portal>
        <div
          {...rest}
          ref={rootRef}
          class={bem()}
          style={{
            position: 'fixed',
            left: `${local.state.position.x}px`,
            top: `${local.state.position.y}px`,
            'z-index': 2000,
            ...local.style,
          }}
          onContextMenu={event => {
            event.preventDefault()
          }}
        >
          <Menu items={items()} mode="vertical" selectable={false} onClick={handleClick} />
        </div>
      </Portal>
    </Show>
  )
}

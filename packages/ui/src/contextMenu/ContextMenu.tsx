import { Menu, type MenuClickInfo } from '@diagen/components'
import { createEventListener } from '@diagen/primitives'
import type { JSX } from 'solid-js'
import { createMemo, Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'
import { createIconRegistry, renderIcon, type IconRegistryOverrides } from '../iconRegistry'
import { createContextMenuBridge } from './createContextMenuBridge'
import type { ContextMenuEntries, ContextMenuItem, ContextMenuPosition } from './types'

export interface ContextMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style' | 'onSelect'> {
  open: boolean
  position: ContextMenuPosition
  onClose?: () => void
  iconRegistry?: IconRegistryOverrides
  entries?: ContextMenuEntries
  style?: JSX.CSSProperties
  renderIcon?: (icon: string, item: ContextMenuItem) => JSX.Element | undefined
}


export function ContextMenu(props: ContextMenuProps) {
  const [local, rest] = splitProps(props, [
    'open',
    'position',
    'onClose',
    'renderIcon',
    'iconRegistry',
    'entries',
    'style',
  ])
  const bridge = createContextMenuBridge(local.entries)
  const iconRegistry = createIconRegistry(local.iconRegistry)
  const _renderIcon = (icon: ContextMenuItem['icon'], item: ContextMenuItem) => {
    return typeof icon === 'string'
      ? local.renderIcon
        ? local.renderIcon(icon, item)
        : renderIcon(icon as any, iconRegistry)
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
        icon: _renderIcon(item.icon, item),
      }
    }),
  )

  let rootRef: HTMLDivElement | undefined

  const handleDocumentPointerDown = (event: MouseEvent) => {
    if (!local.open) return
    const target = event.target as Node | null
    if (rootRef && target && !rootRef.contains(target)) {
      local.onClose?.()
    }
  }

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (!local.open) return
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
    <Show when={local.open}>
      <Portal>
        <div
          {...rest}
          ref={rootRef}
          style={{
            position: 'fixed',
            left: `${local.position.x}px`,
            top: `${local.position.y}px`,
            'z-index': 2000,
            padding: '6px',
            'min-width': '220px',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            'border-radius': '14px',
            background: '#fff',
            'box-shadow': '0 18px 40px rgba(15, 23, 42, 0.16)',
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

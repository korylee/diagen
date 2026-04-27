import { Menu, type MenuClickInfo, type MenuDataItem } from '@diagen/components'
import { createElementSize, onClickOutside, useEventListener } from '@diagen/primitives'
import { createDgBem, type Point } from '@diagen/shared'
import type { JSX } from 'solid-js'
import { createMemo, createSignal, Show, splitProps } from 'solid-js'
import { Portal } from 'solid-js/web'
import { useUIIconRegistry } from '../../config'
import { renderIcon } from '../../iconRegistry'
import type { ResolvedContextMenuAction, ResolvedContextMenuDivider, ResolvedContextMenuEntry } from './types'

import './index.scss'

const CONTEXT_MENU_VIEWPORT_GAP = 8
const CONTEXT_MENU_Z_INDEX = 11000

function isDivider(entry: ResolvedContextMenuEntry): entry is ResolvedContextMenuDivider {
  return (entry as ResolvedContextMenuDivider).type === 'divider'
}

export interface ContextMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style' | 'onSelect' | 'onClose'> {
  open: boolean
  position: Point
  items: readonly ResolvedContextMenuEntry[]
  onSelect: (id: string) => void
  onClose?: (reason: 'outside' | 'escape' | 'select') => void
  style?: JSX.CSSProperties
  renderIcon?: (icon: string, item: ResolvedContextMenuAction) => JSX.Element | undefined
}

const bem = createDgBem('context-menu')

function clampMenuCoordinate(value: number, size: number, viewportSize: number): number {
  if (size <= 0) {
    return Math.max(CONTEXT_MENU_VIEWPORT_GAP, value)
  }

  const max = Math.max(CONTEXT_MENU_VIEWPORT_GAP, viewportSize - size - CONTEXT_MENU_VIEWPORT_GAP)
  return Math.min(Math.max(value, CONTEXT_MENU_VIEWPORT_GAP), max)
}

export function ContextMenu(props: ContextMenuProps) {
  const [local, rest] = splitProps(props, ['open', 'position', 'items', 'onSelect', 'onClose', 'renderIcon', 'style'])
  const iconRegistry = useUIIconRegistry()
  const renderMenuIcon = (icon: ResolvedContextMenuAction['icon'], item: ResolvedContextMenuAction) => {
    return typeof icon === 'string'
      ? local.renderIcon
        ? local.renderIcon(icon, item)
        : renderIcon(icon as any, iconRegistry())
      : icon?.({})
  }
  const items = createMemo<readonly MenuDataItem[]>(() => {
    function mapEntry(entry: ResolvedContextMenuEntry): MenuDataItem {
      if (isDivider(entry)) {
        return { type: 'divider', key: entry.key }
      }

      const icon = renderMenuIcon(entry.icon, entry)

      if (entry.children?.length) {
        return {
          key: entry.key,
          label: entry.label,
          icon,
          disabled: entry.disabled,
          children: entry.children.map(mapEntry),
        }
      }

      return {
        key: entry.key,
        label: entry.label,
        disabled: entry.disabled,
        extra: entry.extra,
        danger: entry.danger,
        'data-menu-id': entry.key,
        icon,
      }
    }

    return local.items.map(mapEntry)
  })

  const [rootRef, setRootRef] = createSignal<HTMLDivElement>()
  const { width: menuWidth, height: menuHeight } = createElementSize(rootRef, {
    box: 'border-box',
  })

  const resolvedPosition = createMemo(() => ({
    x: clampMenuCoordinate(local.position.x, menuWidth(), window.innerWidth),
    y: clampMenuCoordinate(local.position.y, menuHeight(), window.innerHeight),
  }))

  useEventListener(window, 'keydown', event => {
    if (event.key === 'Escape' && local.open) {
      local.onClose?.('escape')
    }
  })

  onClickOutside(rootRef, () => {
    if (local.open) {
      local.onClose?.('outside')
    }
  })

  const handleClick = (info: MenuClickInfo) => {
    local.onSelect(info.key)
    local.onClose?.('select')
  }

  return (
    <Show when={local.open}>
      <Portal>
        <div
          {...rest}
          ref={setRootRef}
          class={bem()}
          data-context-menu="true"
          style={{
            position: 'fixed',
            left: `${resolvedPosition().x}px`,
            top: `${resolvedPosition().y}px`,
            'z-index': CONTEXT_MENU_Z_INDEX,
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

import type { JSX } from 'solid-js'
import { For, Show, splitProps } from 'solid-js'

import { createDgBem, cx } from '@diagen/shared'

import type {
  SidebarCategory,
  SidebarCategoryRailProps,
  StencilGridProps,
  StencilTileItem,
  StencilTileProps,
} from './types'

const bem = createDgBem('sidebar')

export function SidebarCategoryRail(props: SidebarCategoryRailProps): JSX.Element {
  const [local, rest] = splitProps(props, ['categories', 'activeCategoryId', 'readonly', 'onCategorySelect', 'class'])

  return (
    <div
      {...rest}
      class={cx(bem('category-rail', { readonly: local.readonly }), local.class)}
      role="tablist"
      aria-orientation="vertical"
    >
      <For each={local.categories}>
        {category => {
          const isActive = () => category.id === local.activeCategoryId
          const isDisabled = () => Boolean(local.readonly || category.disabled)

          return (
            <button
              type="button"
              role="tab"
              class={cx(bem('category-rail-item', { active: isActive(), disabled: isDisabled() }), local.class)}
              data-active={isActive() ? 'true' : undefined}
              disabled={isDisabled()}
              title={category.title ?? category.label}
              aria-selected={isActive()}
              onClick={() => {
                if (isDisabled()) return
                local.onCategorySelect?.(category)
              }}
            >
              <Show when={category.icon}>
                <span class={bem('category-rail-icon')} aria-hidden="true">
                  {category.icon}
                </span>
              </Show>
              <span class={bem('category-rail-label')}>{category.label}</span>
              <Show when={category.badge}>
                <span class={bem('category-rail-badge')}>{category.badge}</span>
              </Show>
            </button>
          )
        }}
      </For>
    </div>
  )
}

export function StencilTile(props: StencilTileProps): JSX.Element {
  const [local, rest] = splitProps(props, ['item', 'selected', 'readonly', 'onSelect', 'onDoubleSelect', 'class'])
  const isSelected = () => local.item.active ?? local.selected ?? false
  const isDisabled = () => Boolean(local.readonly || local.item.disabled)

  return (
    <button
      {...rest}
      type="button"
      class={cx(bem('stencil-tile'), local.class)}
      data-active={isSelected() ? 'true' : undefined}
      data-disabled={isDisabled() ? 'true' : undefined}
      disabled={isDisabled()}
      title={local.item.title ?? local.item.label}
      onClick={() => {
        if (isDisabled()) return
        local.item.onSelect?.()
        local.onSelect?.(local.item)
      }}
      onDblClick={() => {
        if (isDisabled()) return
        local.item.onDoubleSelect?.()
        local.onDoubleSelect?.(local.item)
      }}
    >
      <Show when={local.item.preview || local.item.icon}>
        <span class={bem('stencil-preview')} aria-hidden="true">
          {local.item.preview ?? local.item.icon}
        </span>
      </Show>

      <span class={bem('stencil-copy')}>
        <span class={bem('stencil-title-row')}>
          <span class={bem('stencil-label')}>{local.item.label}</span>
          <Show when={local.item.meta}>
            <span class={bem('stencil-meta')}>{local.item.meta}</span>
          </Show>
        </span>
        <Show when={local.item.description}>
          <span class={bem('stencil-description')}>{local.item.description}</span>
        </Show>
      </span>

      <Show when={local.item.badge}>
        <span class={bem('stencil-badge')}>{local.item.badge}</span>
      </Show>
    </button>
  )
}

export function StencilGrid(props: StencilGridProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'items',
    'activeItemId',
    'readonly',
    'emptyState',
    'onItemSelect',
    'onItemDoubleSelect',
    'class',
  ])

  return (
    <div {...rest} class={cx(bem('stencil-grid'), local.class)} role="list">
      <Show when={local.items.length > 0} fallback={<div class={bem('empty')}>{local.emptyState ?? 'No items'}</div>}>
        <For each={local.items}>
          {item => (
            <StencilTile
              item={item}
              selected={item.id === local.activeItemId}
              readonly={local.readonly}
              onSelect={local.onItemSelect}
              onDoubleSelect={local.onItemDoubleSelect}
            />
          )}
        </For>
      </Show>
    </div>
  )
}

export type { SidebarCategory, StencilTileItem }

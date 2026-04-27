import type { JSX } from 'solid-js'
import { createMemo, createSignal, For, mergeProps, Show, splitProps } from 'solid-js'

import { createDgBem, cx } from '@diagen/shared'
import { useUIDefaults } from '../config'
import type {
  SidebarBodyProps,
  SidebarDensity,
  SidebarFrameProps,
  SidebarItemData,
  SidebarPreviewData,
  SidebarRailProps,
  SidebarSearchFieldProps,
  SidebarSectionData,
  SidebarSectionLayout,
} from './types'

import './panel.css'

const bem = createDgBem('panel')

function resolveSectionLayout(section: SidebarSectionData): SidebarSectionLayout {
  return section.layout ?? 'list'
}

function hasSectionHeader(section: SidebarSectionData): boolean {
  return Boolean(section.title || section.description || section.meta || section.headerAction)
}

function resolveItemVisual(
  item: SidebarItemData,
  layout: SidebarSectionLayout,
  renderPreview?: (preview: SidebarPreviewData, variant: 'item' | 'tooltip') => JSX.Element,
): JSX.Element | undefined {
  const preview = item.preview && renderPreview ? renderPreview(item.preview, 'item') : undefined
  return layout === 'grid' ? (preview ?? item.leading) : (item.leading ?? preview)
}

export function SidebarFrame(props: SidebarFrameProps): JSX.Element {
  const [local, rest] = splitProps(props, ['readonly', 'class', 'children'])

  return (
    <aside {...rest} class={cx(bem({ readonly: local.readonly }), local.class)}>
      {local.children}
    </aside>
  )
}

export function SidebarHeader(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div {...rest} class={cx(bem('header'), local.class)}>
      {local.children}
    </div>
  )
}

export function SidebarBody(props: SidebarBodyProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'stacked', 'children'])
  return (
    <div {...rest} class={cx(bem('body', { stacked: local.stacked }), local.class)}>
      {local.children}
    </div>
  )
}

export function SidebarFooter(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'children'])
  return (
    <div {...rest} class={cx(bem('footer'), local.class)}>
      {local.children}
    </div>
  )
}

export function SidebarSearchField(props: SidebarSearchFieldProps): JSX.Element {
  const defaults = useUIDefaults()
  const merged = mergeProps(
    {
      placeholder: defaults().ui.sidebar.searchPlaceholder,
    },
    props,
  )
  const [local, rest] = splitProps(merged, ['class', 'style', 'value', 'placeholder', 'onInput', 'onClear'])

  return (
    <label {...rest} class={cx(bem('search'), local.class)} style={local.style}>
      <input
        class={bem('search-input')}
        type="text"
        value={local.value}
        placeholder={local.placeholder}
        onInput={event => local.onInput(event.currentTarget.value)}
      />
      <Show when={local.value.length > 0}>
        <button
          type="button"
          class={bem('search-clear')}
          aria-label="Clear search"
          onClick={() => {
            local.onClear?.()
            local.onInput('')
          }}
        >
          x
        </button>
      </Show>
    </label>
  )
}

function SidebarSectionHeader(props: {
  section: SidebarSectionData
  collapsed: boolean
  onToggle?: () => void
  class?: string
}): JSX.Element {
  return (
    <Show when={hasSectionHeader(props.section)}>
      <div
        class={cx(bem('section-head'), props.class)}
        data-collapsible={props.section.collapsible ? 'true' : undefined}
        onClick={() => props.onToggle?.()}
      >
        <div class={bem('section-heading')}>
          <span class={bem('section-caret')}>{props.section.collapsible ? (props.collapsed ? '+' : '-') : ''}</span>
          <div class={bem('section-copy')}>
            <div class={bem('section-title-row')}>
              <Show when={props.section.title}>
                <span class={bem('section-title')}>{props.section.title}</span>
              </Show>
              <Show when={props.section.meta}>
                <span class={bem('section-meta')}>{props.section.meta}</span>
              </Show>
            </div>
            <Show when={props.section.description}>
              <div class={bem('section-description')}>{props.section.description}</div>
            </Show>
          </div>
        </div>

        <Show when={props.section.headerAction}>
          {headerAction => (
            <div
              class={bem('section-action')}
              onClick={event => {
                event.stopPropagation()
              }}
            >
              {headerAction()}
            </div>
          )}
        </Show>
      </div>
    </Show>
  )
}

function SidebarItemButton(props: {
  item: SidebarItemData
  layout: SidebarSectionLayout
  activeItemId?: string
  readonly?: boolean
  onItemSelect?: (item: SidebarItemData) => void
  density?: SidebarDensity
  renderPreview?: (preview: SidebarPreviewData, variant: 'item' | 'tooltip') => JSX.Element
}): JSX.Element {
  const isGrid = () => props.layout === 'grid'
  const isActive = () => props.item.active ?? props.item.id === props.activeItemId
  const isDisabled = () => Boolean(props.readonly || props.item.disabled)
  const visual = () => resolveItemVisual(props.item, props.layout, props.renderPreview)
  const [isTooltipOpen, setIsTooltipOpen] = createSignal(false)
  const hasTooltip = () => Boolean(props.item.preview && props.renderPreview) && !isDisabled()

  return (
    <button
      type="button"
      role="listitem"
      class={bem('item', [isGrid() ? 'grid' : 'list'])}
      disabled={isDisabled()}
      title={hasTooltip() ? undefined : (props.item.title ?? props.item.label)}
      data-active={isActive() ? 'true' : undefined}
      data-disabled={isDisabled() ? 'true' : undefined}
      data-density={props.density ?? 'comfortable'}
      data-tooltip-open={isTooltipOpen() ? 'true' : undefined}
      onMouseEnter={() => {
        if (!hasTooltip()) return
        setIsTooltipOpen(true)
      }}
      onMouseLeave={() => {
        setIsTooltipOpen(false)
      }}
      onFocus={() => {
        if (!hasTooltip()) return
        setIsTooltipOpen(true)
      }}
      onBlur={() => {
        setIsTooltipOpen(false)
      }}
      onClick={() => {
        if (isDisabled()) return
        props.item.onSelect?.()
        props.onItemSelect?.(props.item)
      }}
      onDblClick={() => {
        if (isDisabled()) return
        props.item.onDoubleSelect?.()
      }}
    >
      <Show when={visual()}>
        <span class={bem('item-visual')} aria-hidden="true">
          {visual()}
        </span>
      </Show>

      <span class={bem('item-copy')}>
        <span class={bem('item-title-row')}>
          <span class={bem('item-label')}>{props.item.label}</span>
          <Show when={props.item.meta}>
            <span class={bem('item-meta')}>{props.item.meta}</span>
          </Show>
        </span>
        <Show when={props.item.description}>
          <span class={bem('item-description')}>{props.item.description}</span>
        </Show>
      </span>

      <Show when={props.item.badge}>{badge => <span class={bem('item-badge')}>{badge()}</span>}</Show>

      <Show when={isTooltipOpen() && !isDisabled() && props.item.preview}>
        {preview => (
          <span class={bem('item-tooltip')} role="tooltip" aria-hidden="true">
            <span class={bem('item-tooltip-card')}>
              <span class={bem('item-tooltip-visual')}>{props.renderPreview?.(preview(), 'tooltip')}</span>
              <span class={bem('item-tooltip-copy')}>
                <span class={bem('item-tooltip-label')}>{props.item.label}</span>
                <Show when={props.item.description}>
                  <span class={bem('item-tooltip-description')}>{props.item.description}</span>
                </Show>
              </span>
            </span>
          </span>
        )}
      </Show>
    </button>
  )
}

export function SidebarSection(props: {
  section: SidebarSectionData
  activeItemId?: string
  readonly?: boolean
  emptyState?: JSX.Element
  density?: SidebarDensity
  onCollapsedChange?: (collapsed: boolean) => void
  onItemSelect?: (item: SidebarItemData, section: SidebarSectionData) => void
  renderPreview?: (preview: SidebarPreviewData, variant: 'item' | 'tooltip') => JSX.Element
}): JSX.Element {
  const defaults = useUIDefaults()
  const layout = createMemo<SidebarSectionLayout>(() => resolveSectionLayout(props.section))
  const [internalCollapsed, setInternalCollapsed] = createSignal(props.section.defaultCollapsed ?? false)
  const collapsed = createMemo<boolean>(() => {
    if (!props.section.collapsible) return false
    return props.section.collapsed ?? internalCollapsed()
  })

  const toggleSection = () => {
    if (!props.section.collapsible || props.section.collapsed !== undefined) return

    const nextCollapsed = !collapsed()
    setInternalCollapsed(nextCollapsed)
    props.onCollapsedChange?.(nextCollapsed)
  }

  return (
    <section class={bem('section')} data-layout={layout()}>
      <SidebarSectionHeader section={props.section} collapsed={collapsed()} onToggle={toggleSection} />

      <Show when={!collapsed()}>
        <Show
          when={props.section.items.length > 0}
          fallback={<div class={bem('empty')}>{props.emptyState ?? defaults().ui.sidebar.emptyText}</div>}
        >
          <div class={bem('section-content', [layout() === 'grid' ? 'grid' : 'list'])} role="list">
            <For each={props.section.items}>
              {item => (
                <SidebarItemButton
                  item={item}
                  layout={layout()}
                  activeItemId={props.activeItemId}
                  readonly={props.readonly}
                  density={props.density}
                  renderPreview={props.renderPreview}
                  onItemSelect={resolvedItem => props.onItemSelect?.(resolvedItem, props.section)}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  )
}

export function SidebarRail(props: SidebarRailProps): JSX.Element {
  const [local, rest] = splitProps(props, ['items', 'activeItemId', 'readonly', 'onItemSelect', 'class'])

  return (
    <div
      {...rest}
      class={cx(bem('rail', { readonly: local.readonly }), local.class)}
      role="tablist"
      aria-orientation="vertical"
    >
      <For each={local.items}>
        {item => {
          const isActive = () => item.id === local.activeItemId
          const isDisabled = () => Boolean(local.readonly || item.disabled)

          return (
            <button
              type="button"
              role="tab"
              class={bem('rail-item', { active: isActive(), disabled: isDisabled() })}
              data-active={isActive() ? 'true' : undefined}
              aria-selected={isActive()}
              disabled={isDisabled()}
              title={item.title ?? item.label}
              onClick={() => {
                if (isDisabled()) return
                local.onItemSelect?.(item)
              }}
            >
              <Show when={item.icon}>
                <span class={bem('rail-icon')} aria-hidden="true">
                  {item.icon}
                </span>
              </Show>
              <span class={bem('rail-label')}>{item.label}</span>
              <Show when={item.badge}>
                <span class={bem('rail-badge')}>{item.badge}</span>
              </Show>
            </button>
          )
        }}
      </For>
    </div>
  )
}

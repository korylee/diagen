import type { JSX } from 'solid-js'
import { createMemo, createSignal, For, Show, splitProps } from 'solid-js'

import { createDgBem } from '@diagen/shared'
import type { SidebarItem, SidebarProps, SidebarSearchProps, SidebarSection, SidebarSectionLayout } from './types'

import './index.css'

const bem = createDgBem('sidebar')

function getSectionKey(section: SidebarSection, index: number): string {
  return section.id ?? `section-${index}`
}

function resolveSectionLayout(section: SidebarSection): SidebarSectionLayout {
  return section.layout ?? 'list'
}

function hasSectionHeader(section: SidebarSection): boolean {
  return Boolean(section.title || section.description || section.meta || section.headerAction)
}

function SidebarSearchBox(props: { search: SidebarSearchProps }) {
  return (
    <label class={bem('search')}>
      <input
        class={bem('search-input')}
        type="text"
        value={props.search.value}
        placeholder={props.search.placeholder ?? 'Search'}
        onInput={event => props.search.onInput(event.currentTarget.value)}
      />
      <Show when={props.search.value.length > 0}>
        <button
          type="button"
          class={bem('search-clear')}
          aria-label="Clear search"
          onClick={() => {
            props.search.onClear?.()
            props.search.onInput('')
          }}
        >
          x
        </button>
      </Show>
    </label>
  )
}

function SidebarItemView(props: {
  item: SidebarItem
  section: SidebarSection
  layout: SidebarSectionLayout
  activeItemId?: string
  readonly?: boolean
  onItemSelect?: (item: SidebarItem, section: SidebarSection) => void
}) {
  const isTile = () => props.layout === 'grid'
  const isActive = () => props.item.active ?? props.item.id === props.activeItemId
  const isDisabled = () => Boolean(props.readonly || props.item.disabled)

  return (
    <button
      type="button"
      role="listitem"
      class={bem('item', [isTile() ? 'tile' : 'row'])}
      disabled={isDisabled()}
      title={props.item.title ?? props.item.label}
      data-active={isActive() ? 'true' : undefined}
      data-disabled={isDisabled() ? 'true' : undefined}
      onClick={() => {
        if (isDisabled()) {
          return
        }

        props.item.onSelect?.()
        props.onItemSelect?.(props.item, props.section)
      }}
    >
      <Show when={props.item.preview || props.item.icon}>
        <span class="dg-sidebar__item-preview" aria-hidden="true">
          {props.item.preview ?? props.item.icon}
        </span>
      </Show>

      <span class={bem('item-copy')}>
        <span class={bem('item-title-row')}>
          <span class={bem('item-label')}>{props.item.label}</span>
          <Show when={!isTile() && props.item.meta}>
            <span class={bem('item-meta')}>{props.item.meta}</span>
          </Show>
        </span>
        <Show when={props.item.description}>
          <span class={bem('item-description')}>{props.item.description}</span>
        </Show>
        <Show when={isTile() && props.item.meta}>
          <span class={bem('item-meta')}>{props.item.meta}</span>
        </Show>
      </span>

      <Show when={props.item.badge}>
        <span class={bem('item-badge')}>{props.item.badge}</span>
      </Show>
    </button>
  )
}

function SidebarSectionView(props: {
  section: SidebarSection
  index: number
  activeItemId?: string
  readonly?: boolean
  emptyState?: JSX.Element
  isCollapsed: (section: SidebarSection, index: number) => boolean
  onToggleSection: (section: SidebarSection, index: number) => void
  onItemSelect?: (item: SidebarItem, section: SidebarSection) => void
}): JSX.Element {
  const layout = createMemo<SidebarSectionLayout>(() => resolveSectionLayout(props.section))
  const collapsed = createMemo<boolean>(() => props.isCollapsed(props.section, props.index))

  return (
    <section class={bem('section')} data-layout={layout()}>
      <Show when={hasSectionHeader(props.section)}>
        <div
          class={bem('section-head')}
          data-collapsible={props.section.collapsible ? 'true' : undefined}
          onClick={() => props.onToggleSection(props.section, props.index)}
        >
          <div class={bem('section-heading')}>
            <span class={bem('section-caret')}>{props.section.collapsible ? (collapsed() ? '+' : '-') : ''}</span>
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

      <Show when={!collapsed()}>
        <Show
          when={props.section.items.length > 0}
          fallback={<div class={bem('section-empty')}>{props.section.emptyState ?? props.emptyState ?? 'empty'}</div>}
        >
          <div class={bem('section-content', [layout() === 'grid' ? 'grid' : 'list'])} role="list">
            <For each={props.section.items}>
              {item => (
                <SidebarItemView
                  item={item}
                  section={props.section}
                  layout={layout()}
                  activeItemId={props.activeItemId}
                  readonly={props.readonly}
                  onItemSelect={props.onItemSelect}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  )
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'sections',
    'activeItemId',
    'header',
    'footer',
    'emptyState',
    'readonly',
    'search',
    'onItemSelect',
    'onSectionToggle',
    'class',
  ])
  const [collapsedMap, setCollapsedMap] = createSignal<Record<string, boolean>>({})

  const hasRenderableSections = createMemo<boolean>(() => local.sections.length > 0)

  function isSectionCollapsed(section: SidebarSection, index: number): boolean {
    if (!section.collapsible) {
      return false
    }

    if (section.collapsed !== undefined) {
      return section.collapsed
    }

    const key = getSectionKey(section, index)
    const cachedValue = collapsedMap()[key]
    if (cachedValue !== undefined) {
      return cachedValue
    }

    return section.defaultCollapsed ?? false
  }

  function toggleSection(section: SidebarSection, index: number): void {
    if (!section.collapsible) {
      return
    }

    const nextCollapsed = !isSectionCollapsed(section, index)

    if (section.collapsed === undefined) {
      const key = getSectionKey(section, index)
      setCollapsedMap(current => ({ ...current, [key]: nextCollapsed }))
    }

    local.onSectionToggle?.(section, nextCollapsed)
  }

  return (
    <>
      <aside
        {...rest}
        class={bem({ readonly: local.readonly }) + ' ' + local.class}
        aria-label={(rest['aria-label'] as string | undefined) ?? 'Sidebar'}
      >
        <Show when={local.header}>
          <div class={bem('header')}>{local.header}</div>
        </Show>

        <Show when={local.search}>
          <SidebarSearchBox search={local.search!} />
        </Show>

        <div class="dg-sidebar__body">
          <Show
            when={hasRenderableSections()}
            fallback={<div class="dg-sidebar__empty">{local.emptyState ?? 'No items'}</div>}
          >
            <For each={local.sections}>
              {(section, index) => (
                <SidebarSectionView
                  section={section}
                  index={index()}
                  activeItemId={local.activeItemId}
                  readonly={local.readonly}
                  emptyState={local.emptyState}
                  isCollapsed={isSectionCollapsed}
                  onToggleSection={toggleSection}
                  onItemSelect={local.onItemSelect}
                />
              )}
            </For>
          </Show>
        </div>

        <Show when={local.footer}>
          <div class="dg-sidebar__footer">{local.footer}</div>
        </Show>
      </aside>
    </>
  )
}

export * from './stencil'
export type { SidebarItem, SidebarProps, SidebarSearchProps, SidebarSection, SidebarSectionLayout } from './types'

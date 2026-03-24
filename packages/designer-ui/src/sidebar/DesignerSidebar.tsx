import { createMemo, createSignal, For, type JSX, Show, splitProps } from 'solid-js'
import type { Designer } from '@diagen/core'
import {
  SidebarCategoryRail,
  StencilGrid,
  type SidebarCategory,
  type SidebarSection,
  type SidebarItem,
  type SidebarProps,
} from '@diagen/ui'

import type { DesignerIconRegistryOverrides } from '../designerIconRegistry'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import { createSidebarActionBridge } from './createSidebarActionBridge'
import { createDgBem } from '@diagen/shared'

export interface DesignerSidebarProps extends Omit<SidebarProps, 'sections' | 'activeItemId' | 'search'> {
  designer: Designer
  searchable?: boolean
  searchPlaceholder?: string
  iconRegistry?: DesignerIconRegistryOverrides
}

const bem = createDgBem('sidebar')

const cx = (...classes: (string | false | null | undefined)[]): string => classes.filter(Boolean).join(' ')

function matchesSidebarItem(
  query: string,
  item: { label: string; description?: string; meta?: string; keywords?: readonly string[] },
): boolean {
  if (query === '') {
    return true
  }

  const haystack = [item.label, item.description ?? '', item.meta ?? '', ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function filterSections(sections: readonly SidebarSection[], query: string): SidebarSection[] {
  return sections
    .map(section => {
      const items = section.items.filter(item => matchesSidebarItem(query, item))
      return {
        ...section,
        items,
        meta: items.length.toString(),
      }
    })
    .filter(section => section.items.length > 0)
}

function getSectionKey(section: SidebarSection, index: number): string {
  return section.id ?? `section-${index}`
}

function SidebarSearchBox(props: {
  value: string
  placeholder?: string
  onInput: (value: string) => void
  onClear?: () => void
}) {
  return (
    <label class="dg-sidebar__search">
      <input
        class="dg-sidebar__search-input"
        type="text"
        value={props.value}
        placeholder={props.placeholder ?? 'Search'}
        onInput={event => props.onInput(event.currentTarget.value)}
      />
      <Show when={props.value.length > 0}>
        <button
          type="button"
          class="dg-sidebar__search-clear"
          aria-label="Clear search"
          onClick={() => {
            props.onClear?.()
            props.onInput('')
          }}
        >
          x
        </button>
      </Show>
    </label>
  )
}

function DesignerSidebarActionSection(props: {
  section: SidebarSection
  index: number
  readonly?: boolean
  emptyState?: JSX.Element
  isCollapsed: (section: SidebarSection, index: number) => boolean
  onToggleSection: (section: SidebarSection, index: number) => void
  onItemSelect?: (item: SidebarItem, section: SidebarSection) => void
}) {
  const collapsed = createMemo(() => props.isCollapsed(props.section, props.index))

  return (
    <section class="dg-sidebar__section">
      <Show when={props.section.title || props.section.description || props.section.meta}>
        <div
          class="dg-sidebar__section-head"
          data-collapsible={props.section.collapsible ? 'true' : undefined}
          onClick={() => props.onToggleSection(props.section, props.index)}
        >
          <div class={bem('section-heading')}>
            <span class="dg-sidebar__section-caret">{props.section.collapsible ? (collapsed() ? '+' : '-') : ''}</span>
            <div class="dg-sidebar__section-copy">
              <div class="dg-sidebar__section-title-row">
                <Show when={props.section.title}>
                  <span class="dg-sidebar__section-title">{props.section.title}</span>
                </Show>
                <Show when={props.section.meta}>
                  <span class="dg-sidebar__section-meta">{props.section.meta}</span>
                </Show>
              </div>
              <Show when={props.section.description}>
                <div class="dg-sidebar__section-description">{props.section.description}</div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      <Show when={!collapsed()}>
        <Show
          when={props.section.items.length > 0}
          fallback={<div class="dg-sidebar__empty">{props.emptyState ?? 'No items'}</div>}
        >
          <div class={bem('section-content', ['list'])} role="list">
            <For each={props.section.items}>
              {item => (
                <button
                  type="button"
                  role="listitem"
                  class={bem('item', { row: true, disabled: props.readonly || item.disabled })}
                  disabled={Boolean(props.readonly || item.disabled)}
                  title={item.title ?? item.label}
                  data-disabled={Boolean(props.readonly || item.disabled) ? 'true' : undefined}
                  onClick={() => {
                    if (props.readonly || item.disabled) return
                    item.onSelect?.()
                    props.onItemSelect?.(item, props.section)
                  }}
                >
                  <Show when={item.preview || item.icon}>
                    <span class={bem('item-preview')} aria-hidden="true">
                      {item.preview ?? item.icon}
                    </span>
                  </Show>

                  <span class={bem('item-copy')}>
                    <span class={bem('item-title-row')}>
                      <span class={bem('item-label')}>{item.label}</span>
                      <Show when={item.meta}>
                        <span class={bem('item-meta')}>{item.meta}</span>
                      </Show>
                    </span>
                    <Show when={item.description}>
                      <span class={bem('item-description')}>{item.description}</span>
                    </Show>
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  )
}

function DesignerSidebarShapeSection(props: {
  section: SidebarSection
  activeItemId?: string
  readonly?: boolean
  emptyState?: JSX.Element
  onItemSelect?: (item: SidebarItem, section: SidebarSection) => void
}) {
  return (
    <section class="dg-sidebar__section">
      <Show when={props.section.title || props.section.description || props.section.meta}>
        <div class="dg-sidebar__section-head">
          <div class="dg-sidebar__section-heading">
            <div class="dg-sidebar__section-copy">
              <div class="dg-sidebar__section-title-row">
                <Show when={props.section.title}>
                  <span class="dg-sidebar__section-title">{props.section.title}</span>
                </Show>
                <Show when={props.section.meta}>
                  <span class="dg-sidebar__section-meta">{props.section.meta}</span>
                </Show>
              </div>
              <Show when={props.section.description}>
                <div class="dg-sidebar__section-description">{props.section.description}</div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      <div class="dg-sidebar__section-content">
        <StencilGrid
          items={props.section.items}
          activeItemId={props.activeItemId}
          readonly={props.readonly}
          emptyState={props.emptyState}
          onItemSelect={item => {
            props.onItemSelect?.(item, props.section)
          }}
        />
      </div>
    </section>
  )
}

export function DesignerSidebar(props: DesignerSidebarProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'designer',
    'searchable',
    'searchPlaceholder',
    'iconRegistry',
    'emptyState',
    'header',
    'footer',
    'readonly',
    'onItemSelect',
    'onSectionToggle',
    'class',
  ])

  const shapeLibrary = createShapeLibraryBridge(local.designer)
  const actionBridge = createSidebarActionBridge(local.designer, {
    iconRegistry: local.iconRegistry,
  })

  const [searchValue, setSearchValue] = createSignal<string>('')
  const [activeCategoryId, setActiveCategoryId] = createSignal<string | undefined>()
  const [collapsedActionMap, setCollapsedActionMap] = createSignal<Record<string, boolean>>({})

  const normalizedQuery = createMemo<string>(() => searchValue().trim().toLowerCase())
  const isSearching = createMemo<boolean>(() => normalizedQuery().length > 0)
  const shapeSections = createMemo<SidebarSection[]>(() => filterSections(shapeLibrary.sections(), normalizedQuery()))
  const actionSections = createMemo<SidebarSection[]>(() => filterSections(actionBridge.sections(), normalizedQuery()))

  const categoryItems = createMemo<SidebarCategory[]>(() =>
    shapeSections().map(section => ({
      id: section.id ?? section.title ?? 'category',
      label: section.title ?? 'Category',
      title: section.description ?? section.title,
      badge: section.meta,
    })),
  )

  const resolvedActiveCategoryId = createMemo<string | undefined>(() => {
    const categories = categoryItems()
    if (categories.length === 0) return undefined

    const current = activeCategoryId()
    if (current && categories.some(category => category.id === current)) {
      return current
    }

    const activeToolId = shapeLibrary.activeItemId()
    if (activeToolId) {
      const matchedSection = shapeSections().find(section => section.items.some(item => item.id === activeToolId))
      if (matchedSection?.id) {
        return matchedSection.id
      }
    }

    return categories[0]?.id
  })

  const activeShapeSection = createMemo<SidebarSection | undefined>(() => {
    const targetId = resolvedActiveCategoryId()
    return shapeSections().find(section => section.id === targetId) ?? shapeSections()[0]
  })
  const visibleShapeSections = createMemo<SidebarSection[]>(() => {
    if (isSearching()) {
      return shapeSections()
    }

    const section = activeShapeSection()
    return section ? [section] : []
  })
  const hasVisibleShapeSections = createMemo<boolean>(() => visibleShapeSections().length > 0)
  const hasActionSections = createMemo<boolean>(() => actionSections().length > 0)
  const showCategoryRail = createMemo<boolean>(() => !isSearching() && categoryItems().length > 1)

  const shellClass = createMemo(() => cx(bem({ readonly: local.readonly }), local.class))

  const isActionSectionCollapsed = (section: SidebarSection, index: number): boolean => {
    if (!section.collapsible) return false
    if (section.collapsed !== undefined) return section.collapsed

    const key = getSectionKey(section, index)
    const cachedValue = collapsedActionMap()[key]
    if (cachedValue !== undefined) {
      return cachedValue
    }

    return section.defaultCollapsed ?? false
  }

  const toggleActionSection = (section: SidebarSection, index: number): void => {
    if (!section.collapsible) return

    const nextCollapsed = !isActionSectionCollapsed(section, index)
    if (section.collapsed === undefined) {
      const key = getSectionKey(section, index)
      setCollapsedActionMap(current => ({ ...current, [key]: nextCollapsed }))
    }

    local.onSectionToggle?.(section, nextCollapsed)
  }

  return (
    <aside {...rest} class={shellClass()} aria-label={rest['aria-label'] ?? 'Designer Sidebar'}>
      <Show when={local.header}>
        <div class="dg-sidebar__header">{local.header}</div>
      </Show>

      <Show when={local.searchable === false ? false : true}>
        <SidebarSearchBox
          value={searchValue()}
          placeholder={local.searchPlaceholder ?? 'Search'}
          onInput={setSearchValue}
          onClear={() => setSearchValue('')}
        />
      </Show>

      <div class={bem('body', ['stacked'])}>
        <Show when={hasVisibleShapeSections()}>
          <Show
            when={showCategoryRail()}
            fallback={
              <div class="dg-sidebar__library-stack">
                <For each={visibleShapeSections()}>
                  {section => (
                    <DesignerSidebarShapeSection
                      section={section}
                      activeItemId={shapeLibrary.activeItemId()}
                      readonly={local.readonly}
                      emptyState={local.emptyState}
                      onItemSelect={local.onItemSelect}
                    />
                  )}
                </For>
              </div>
            }
          >
            <div class="dg-sidebar__library-shell">
              <SidebarCategoryRail
                categories={categoryItems()}
                activeCategoryId={resolvedActiveCategoryId()}
                readonly={local.readonly}
                onCategorySelect={category => setActiveCategoryId(category.id)}
              />

              <div class="dg-sidebar__library-panel">
                <For each={visibleShapeSections()}>
                  {section => (
                    <DesignerSidebarShapeSection
                      section={section}
                      activeItemId={shapeLibrary.activeItemId()}
                      readonly={local.readonly}
                      emptyState={local.emptyState}
                      onItemSelect={local.onItemSelect}
                    />
                  )}
                </For>
              </div>
            </div>
          </Show>
        </Show>

        <Show when={hasActionSections()}>
          <div class="dg-sidebar__library-stack">
            <For each={actionSections()}>
              {(section, index) => (
                <DesignerSidebarActionSection
                  section={section}
                  index={index()}
                  readonly={local.readonly}
                  emptyState={local.emptyState}
                  isCollapsed={isActionSectionCollapsed}
                  onToggleSection={toggleActionSection}
                  onItemSelect={local.onItemSelect}
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={!hasVisibleShapeSections() && !hasActionSections()}>
          <div class="dg-sidebar__empty">{local.emptyState ?? 'No items'}</div>
        </Show>
      </div>

      <Show when={local.footer}>
        <div class="dg-sidebar__footer">{local.footer}</div>
      </Show>
    </aside>
  )
}

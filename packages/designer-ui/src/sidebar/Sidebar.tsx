import { createMemo, createSignal, For, Show, splitProps, type JSX } from 'solid-js'
import type { Designer } from '@diagen/core'
import { createDgBem, cx, ensureArray } from '@diagen/shared'
import {
  createPanelSectionCollapse,
  PanelBody,
  PanelFooter,
  PanelFrame,
  PanelHeader,
  PanelRail,
  PanelSearchField,
  PanelSection,
  type PanelFrameProps,
  type PanelItemData,
  type PanelRailItem,
  type PanelSectionData,
} from '@diagen/ui'

import type { DesignerIconRegistryOverrides } from '../designerIconRegistry'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import { createSidebarActionBridge } from './createSidebarActionBridge'
import { createPanelRailItems, createPanelSearchSections, filterPanelSections } from './search'

import './sidebar.css'

export interface SidebarProps extends Omit<PanelFrameProps, 'children'> {
  designer: Designer
  searchable?: boolean
  searchPlaceholder?: string
  iconRegistry?: DesignerIconRegistryOverrides
  header?: JSX.Element
  footer?: JSX.Element
  emptyState?: JSX.Element
  onItemSelect?: (item: PanelItemData, section: PanelSectionData) => void
  onSectionToggle?: (section: PanelSectionData, collapsed: boolean) => void
}

const bem = createDgBem('sidebar')

export function Sidebar(props: SidebarProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'designer',
    'searchable',
    'searchPlaceholder',
    'iconRegistry',
    'header',
    'footer',
    'emptyState',
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
  const { isCollapsed: isActionSectionCollapsed, toggleSection: toggleActionSection } =
    createPanelSectionCollapse(local.onSectionToggle)

  const normalizedQuery = createMemo<string>(() => searchValue().trim().toLowerCase())
  const isSearching = createMemo<boolean>(() => normalizedQuery().length > 0)
  const librarySections = createMemo<readonly PanelSectionData[]>(() => shapeLibrary.sections())
  const allActionSections = createMemo<readonly PanelSectionData[]>(() => actionBridge.sections())
  const librarySearchSections = createMemo<PanelSectionData[]>(() =>
    isSearching() ? filterPanelSections(librarySections(), normalizedQuery()) : [...librarySections()],
  )
  const searchSections = createMemo<PanelSectionData[]>(() =>
    isSearching() ? createPanelSearchSections(librarySections(), allActionSections(), normalizedQuery()) : [],
  )
  const actionSections = createMemo<PanelSectionData[]>(() => (isSearching() ? [] : [...allActionSections()]))
  const railItems = createMemo<PanelRailItem[]>(() => createPanelRailItems(librarySearchSections()))

  const resolvedActiveCategoryId = createMemo<string | undefined>(() => {
    const categories = railItems()
    if (categories.length === 0) return undefined

    const current = activeCategoryId()
    if (current && categories.some(item => item.id === current)) {
      return current
    }

    const activeToolId = shapeLibrary.activeItemId()
    if (activeToolId) {
      const matchedSection = librarySearchSections().find(section => section.items.some(item => item.id === activeToolId))
      if (matchedSection?.id) {
        return matchedSection.id
      }
    }

    return categories[0]?.id
  })

  const activeLibrarySection = createMemo<PanelSectionData | undefined>(() => {
    const targetId = resolvedActiveCategoryId()
    return librarySearchSections().find(section => section.id === targetId) ?? librarySearchSections()[0]
  })
  const visibleLibrarySections = createMemo<PanelSectionData[]>(() => {
    if (isSearching()) return []
    return ensureArray(activeLibrarySection())
  })

  const hasSearchSections = createMemo<boolean>(() => searchSections().length > 0)
  const hasVisibleLibrarySections = createMemo<boolean>(() => visibleLibrarySections().length > 0)
  const hasActionSections = createMemo<boolean>(() => actionSections().length > 0)
  const showRail = createMemo<boolean>(() => !isSearching() && railItems().length > 1)
  const rootClass = createMemo(() => cx(bem(), local.class))

  return (
    <PanelFrame
      {...rest}
      readonly={local.readonly}
      class={rootClass()}
      data-searching={isSearching() ? 'true' : undefined}
      aria-label={rest['aria-label'] ?? 'Sidebar'}
    >
      <Show when={local.header}>
        <PanelHeader>{local.header}</PanelHeader>
      </Show>

      <Show when={local.searchable !== false}>
        <PanelSearchField
          value={searchValue()}
          placeholder={local.searchPlaceholder ?? 'Search'}
          onInput={setSearchValue}
          onClear={() => setSearchValue('')}
        />
      </Show>

      <PanelBody stacked class={bem('body')}>
        <Show when={hasSearchSections()}>
          <div class={bem('stack')}>
            <For each={searchSections()}>
              {(section, index) => (
                <PanelSection
                  section={section}
                  index={index()}
                  readonly={local.readonly}
                  emptyState={local.emptyState}
                  isCollapsed={() => false}
                  onToggleSection={() => {}}
                  onItemSelect={local.onItemSelect}
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={hasVisibleLibrarySections()}>
          <Show
            when={showRail()}
            fallback={
              <div class={bem('stack')}>
                <For each={visibleLibrarySections()}>
                  {(section, index) => (
                    <PanelSection
                      section={section}
                      index={index()}
                      activeItemId={shapeLibrary.activeItemId()}
                      readonly={local.readonly}
                      emptyState={local.emptyState}
                      density="compact"
                      isCollapsed={() => false}
                      onToggleSection={() => {}}
                      onItemSelect={local.onItemSelect}
                    />
                  )}
                </For>
              </div>
            }
          >
            <div class={bem('library-shell')}>
              <PanelRail
                class={bem('rail')}
                items={railItems()}
                activeItemId={resolvedActiveCategoryId()}
                readonly={local.readonly}
                onItemSelect={item => setActiveCategoryId(item.id)}
              />

              <div class={bem('library-panel')}>
                <For each={visibleLibrarySections()}>
                  {(section, index) => (
                    <PanelSection
                      section={section}
                      index={index()}
                      activeItemId={shapeLibrary.activeItemId()}
                      readonly={local.readonly}
                      emptyState={local.emptyState}
                      density="compact"
                      isCollapsed={() => false}
                      onToggleSection={() => {}}
                      onItemSelect={local.onItemSelect}
                    />
                  )}
                </For>
              </div>
            </div>
          </Show>
        </Show>

        <Show when={hasActionSections()}>
          <div class={bem('stack')}>
            <For each={actionSections()}>
              {(section, index) => (
                <PanelSection
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

        <Show when={!hasSearchSections() && !hasVisibleLibrarySections() && !hasActionSections()}>
          <div class="dg-panel__empty">{local.emptyState ?? 'No items'}</div>
        </Show>
      </PanelBody>

      <Show when={local.footer}>
        <PanelFooter>{local.footer}</PanelFooter>
      </Show>
    </PanelFrame>
  )
}

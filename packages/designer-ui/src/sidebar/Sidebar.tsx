import { createEffect, createMemo, createSignal, For, Show, splitProps, type JSX } from 'solid-js'
import type { Designer } from '@diagen/core'
import { createDgBem, cx, ensureArray } from '@diagen/shared'
import {
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

import {
  createIconRegistry,
  renderIcon,
  type IconRegistryOverrides,
} from '../designerIconRegistry'
import { syncCreationModeForActiveTool, type SidebarCreationMode } from './creationMode'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import { createPanelRailItems, createPanelSearchSections, filterPanelSections } from './search'

import './sidebar.css'

export interface SidebarProps extends Omit<PanelFrameProps, 'children'> {
  designer: Designer
  searchable?: boolean
  searchPlaceholder?: string
  iconRegistry?: IconRegistryOverrides
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

  const [creationMode, setCreationMode] = createSignal<SidebarCreationMode>('batch')
  const iconRegistry = createIconRegistry(local.iconRegistry)
  const shapeLibrary = createShapeLibraryBridge(local.designer, {
    creationMode,
  })

  const [searchValue, setSearchValue] = createSignal<string>('')
  const [activeCategoryId, setActiveCategoryId] = createSignal<string | undefined>()

  const normalizedQuery = createMemo<string>(() => searchValue().trim().toLowerCase())
  const isSearching = createMemo<boolean>(() => normalizedQuery().length > 0)
  const librarySections = createMemo<readonly PanelSectionData[]>(() => shapeLibrary.sections())
  const librarySearchSections = createMemo<PanelSectionData[]>(() =>
    isSearching() ? filterPanelSections(librarySections(), normalizedQuery()) : [...librarySections()],
  )
  const searchSections = createMemo<PanelSectionData[]>(() =>
    isSearching() ? createPanelSearchSections(librarySections(), [], normalizedQuery()) : [],
  )
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
      const matchedSection = librarySearchSections().find(section =>
        section.items.some(item => item.id === activeToolId),
      )
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
  const showRail = createMemo<boolean>(() => !isSearching() && railItems().length > 1)

  createEffect(() => {
    syncCreationModeForActiveTool(local.designer, creationMode())
  })

  return (
    <PanelFrame
      {...rest}
      readonly={local.readonly}
      class={cx(bem(), local.class)}
      data-searching={isSearching() ? 'true' : undefined}
      aria-label={rest['aria-label'] ?? 'Sidebar'}
    >
      <PanelHeader class={bem('topbar')}>
        <Show when={local.header}>
          <div class={bem('header-slot')}>{local.header}</div>
        </Show>

        <div class={bem('mode-toggle')} role="group" aria-label="创建模式">
          <button
            type="button"
            class={bem('mode-button')}
            data-active={creationMode() === 'single' ? 'true' : undefined}
            aria-pressed={creationMode() === 'single'}
            aria-label="单个创建"
            title="单个创建"
            onClick={() => setCreationMode('single')}
          >
            {renderIcon('create-single', iconRegistry, {
              size: 16,
              class: bem('mode-icon'),
            })}
          </button>

          <button
            type="button"
            class={bem('mode-button')}
            data-active={creationMode() === 'batch' ? 'true' : undefined}
            aria-pressed={creationMode() === 'batch'}
            aria-label="批量创建"
            title="批量创建"
            onClick={() => setCreationMode('batch')}
          >
            {renderIcon('create-batch', iconRegistry, {
              size: 16,
              class: bem('mode-icon'),
            })}
          </button>
        </div>
      </PanelHeader>

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

        <Show when={!hasSearchSections() && !hasVisibleLibrarySections()}>
          <div class={bem('empty')}>{local.emptyState ?? 'No items'}</div>
        </Show>
      </PanelBody>

      <Show when={local.footer}>
        <PanelFooter>{local.footer}</PanelFooter>
      </Show>
    </PanelFrame>
  )
}

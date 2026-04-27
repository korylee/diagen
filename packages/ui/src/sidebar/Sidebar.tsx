import { createDgBem, cx, ensureArray } from '@diagen/shared'
import { createEffect, createMemo, createSignal, For, mergeProps, Show, splitProps, type JSX } from 'solid-js'
import { TooltipCanvasPreview } from '../preview'
import {
  SidebarBody,
  SidebarFooter,
  SidebarFrame,
  SidebarHeader,
  SidebarRail,
  SidebarSearchField,
  SidebarSection,
} from './panel'
import { SidebarCanvasPreview } from './SidebarCanvasPreview'
import type {
  SidebarFrameProps,
  SidebarItemData,
  SidebarPreviewData,
  SidebarRailItem,
  SidebarSectionData,
} from './types'

import { useUIIconRegistry } from '../config'
import { renderIcon } from '../iconRegistry'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'
import { syncCreationModeForActiveTool, type SidebarCreationMode } from './creationMode'
import { createSidebarRailItems, createSidebarSearchSections, filterSidebarSections } from './search'

import { useDesigner } from '@diagen/renderer'
import './sidebar.css'

export interface SidebarProps extends Omit<SidebarFrameProps, 'children'> {
  searchable?: boolean
  searchPlaceholder?: string
  header?: JSX.Element
  footer?: JSX.Element
  emptyState?: JSX.Element
  onItemSelect?: (item: SidebarItemData, section: SidebarSectionData) => void
  onSectionToggle?: (section: SidebarSectionData, collapsed: boolean) => void
}

const bem = createDgBem('sidebar')

function renderSidebarPreview(preview: SidebarPreviewData, variant: 'item' | 'tooltip'): JSX.Element {
  if (variant === 'tooltip') {
    return <TooltipCanvasPreview {...preview} />
  }
  return <SidebarCanvasPreview {...preview} class="sidebar-preview" />
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const designer = useDesigner()
  const merged = mergeProps(
    {
      searchPlaceholder: 'Search',
    },
    props,
  )
  const [local, rest] = splitProps(merged, [
    'searchable',
    'searchPlaceholder',
    'header',
    'footer',
    'emptyState',
    'readonly',
    'onItemSelect',
    'onSectionToggle',
    'class',
  ])

  const [creationMode, setCreationMode] = createSignal<SidebarCreationMode>('batch')
  const iconRegistry = useUIIconRegistry()
  const { sections, activeItemId } = createShapeLibraryBridge(designer, {
    creationMode,
  })

  const [searchValue, setSearchValue] = createSignal<string>('')
  const [activeCategoryId, setActiveCategoryId] = createSignal<string | undefined>()

  const normalizedQuery = createMemo<string>(() => searchValue().trim().toLowerCase())
  const isSearching = createMemo<boolean>(() => normalizedQuery().length > 0)
  const librarySearchSections = createMemo<SidebarSectionData[]>(() =>
    isSearching() ? filterSidebarSections(sections(), normalizedQuery()) : [...sections()],
  )
  const searchSections = createMemo<SidebarSectionData[]>(() =>
    isSearching() ? createSidebarSearchSections(sections(), [], normalizedQuery()) : [],
  )
  const railItems = createMemo<SidebarRailItem[]>(() => createSidebarRailItems(librarySearchSections()))

  const resolvedActiveCategoryId = createMemo<string | undefined>(() => {
    const categories = railItems()
    if (categories.length === 0) return undefined

    const current = activeCategoryId()
    if (current && categories.some(item => item.id === current)) {
      return current
    }

    const activeToolId = activeItemId()
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

  const visibleLibrarySections = createMemo<SidebarSectionData[]>(() => {
    if (isSearching()) return []
    const targetId = resolvedActiveCategoryId()
    const data = librarySearchSections().find(section => section.id === targetId) ?? librarySearchSections()[0]
    return ensureArray(data)
  })

  const hasSearchSections = createMemo<boolean>(() => searchSections().length > 0)
  const hasVisibleLibrarySections = createMemo<boolean>(() => visibleLibrarySections().length > 0)
  const showRail = createMemo<boolean>(() => !isSearching() && railItems().length > 1)

  createEffect(() => {
    syncCreationModeForActiveTool(designer, creationMode())
  })

  return (
    <SidebarFrame
      {...rest}
      readonly={local.readonly}
      class={cx(bem(), local.class)}
      data-searching={isSearching() ? 'true' : undefined}
      aria-label={rest['aria-label'] ?? 'Sidebar'}
    >
      <SidebarHeader class={bem('topbar')}>
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
            {renderIcon('create-single', iconRegistry(), {
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
            {renderIcon('create-batch', iconRegistry(), {
              size: 16,
              class: bem('mode-icon'),
            })}
          </button>
        </div>
      </SidebarHeader>

      <Show when={local.searchable !== false}>
        <SidebarSearchField
          value={searchValue()}
          placeholder={local.searchPlaceholder}
          onInput={setSearchValue}
          onClear={() => setSearchValue('')}
        />
      </Show>

      <SidebarBody stacked class={bem('body')}>
        <Show when={hasSearchSections()}>
          <div class={bem('stack')}>
            <For each={searchSections()}>
              {section => (
                <SidebarSection
                  section={section}
                  readonly={local.readonly}
                  emptyState={local.emptyState}
                  renderPreview={renderSidebarPreview}
                  onCollapsedChange={collapsed => local.onSectionToggle?.(section, collapsed)}
                  onItemSelect={local.onItemSelect}
                />
              )}
            </For>
          </div>
        </Show>

        <Show
          when={hasVisibleLibrarySections() && showRail()}
          fallback={
            <div class={bem('stack')}>
              <For each={visibleLibrarySections()}>
                {section => (
                  <SidebarSection
                    section={section}
                    activeItemId={activeItemId()}
                    readonly={local.readonly}
                    emptyState={local.emptyState}
                    density="compact"
                    renderPreview={renderSidebarPreview}
                    onCollapsedChange={collapsed => local.onSectionToggle?.(section, collapsed)}
                    onItemSelect={local.onItemSelect}
                  />
                )}
              </For>
            </div>
          }
        >
          <div class={bem('library-shell')}>
            <SidebarRail
              class={bem('rail')}
              items={railItems()}
              activeItemId={resolvedActiveCategoryId()}
              readonly={local.readonly}
              onItemSelect={item => setActiveCategoryId(item.id)}
            />

            <div class={bem('library-panel')}>
              <For each={visibleLibrarySections()}>
                {section => (
                  <SidebarSection
                    section={section}
                    activeItemId={activeItemId()}
                    readonly={local.readonly}
                    emptyState={local.emptyState}
                    density="compact"
                    renderPreview={renderSidebarPreview}
                    onCollapsedChange={collapsed => local.onSectionToggle?.(section, collapsed)}
                    onItemSelect={local.onItemSelect}
                  />
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={!hasSearchSections() && !hasVisibleLibrarySections()}>
          <div class={bem('empty')}>{local.emptyState ?? 'No items'}</div>
        </Show>
      </SidebarBody>

      <Show when={local.footer}>
        <SidebarFooter>{local.footer}</SidebarFooter>
      </Show>
    </SidebarFrame>
  )
}

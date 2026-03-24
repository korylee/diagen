import type { JSX } from 'solid-js'

export type SidebarSectionLayout = 'list' | 'grid'

export interface SidebarItem {
  id: string
  label: string
  description?: string
  badge?: string
  title?: string
  preview?: JSX.Element
  icon?: JSX.Element
  meta?: string
  keywords?: readonly string[]
  disabled?: boolean
  active?: boolean
  onSelect?: () => void
}

export interface SidebarSection {
  id?: string
  title?: string
  description?: string
  meta?: string
  layout?: SidebarSectionLayout
  collapsible?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  headerAction?: JSX.Element
  emptyState?: JSX.Element
  items: readonly SidebarItem[]
}

export interface SidebarSearchProps {
  value: string
  placeholder?: string
  onInput: (value: string) => void
  onClear?: () => void
}

export interface SidebarProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'style'> {
  sections: readonly SidebarSection[]
  activeItemId?: string
  header?: JSX.Element
  footer?: JSX.Element
  emptyState?: JSX.Element
  readonly?: boolean
  search?: SidebarSearchProps
  onItemSelect?: (item: SidebarItem, section: SidebarSection) => void
  onSectionToggle?: (section: SidebarSection, collapsed: boolean) => void
}

export interface SidebarCategory {
  id: string
  label: string
  icon?: JSX.Element
  badge?: string
  title?: string
  disabled?: boolean
}

export interface SidebarCategoryRailProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> {
  categories: readonly SidebarCategory[]
  activeCategoryId?: string
  readonly?: boolean
  onCategorySelect?: (category: SidebarCategory) => void
}

export interface StencilTileItem {
  id: string
  label: string
  description?: string
  preview?: JSX.Element
  icon?: JSX.Element
  meta?: string
  badge?: string
  title?: string
  disabled?: boolean
  active?: boolean
  onSelect?: () => void
  onDoubleSelect?: () => void
}

export interface StencilTileProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'children' | 'onClick' | 'onDblClick'> {
  item: StencilTileItem
  selected?: boolean
  readonly?: boolean
  onSelect?: (item: StencilTileItem) => void
  onDoubleSelect?: (item: StencilTileItem) => void
}

export interface StencilGridProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> {
  items: readonly StencilTileItem[]
  activeItemId?: string
  readonly?: boolean
  emptyState?: JSX.Element
  onItemSelect?: (item: StencilTileItem) => void
  onItemDoubleSelect?: (item: StencilTileItem) => void
}

import type { Accessor, JSX, ParentProps } from 'solid-js'

export type SidebarSectionLayout = 'list' | 'grid'
export type SidebarDensity = 'comfortable' | 'compact'

export interface SidebarSharedProps {
  class?: string
  style?: string
}

export interface SidebarFrameProps
  extends ParentProps<SidebarSharedProps>, Omit<JSX.HTMLAttributes<HTMLElement>, 'class' | 'style'> {
  readonly?: boolean
}

export interface SidebarBodyProps
  extends ParentProps<SidebarSharedProps>, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  stacked?: boolean
}

export interface SidebarSectionData {
  id?: string
  title?: string
  description?: string
  meta?: string
  layout?: SidebarSectionLayout
  collapsible?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  headerAction?: JSX.Element
  items: readonly SidebarItemData[]
}

export interface SidebarItemData {
  id: string
  label: string
  description?: string
  badge?: string
  title?: string
  preview?: JSX.Element
  leading?: JSX.Element
  meta?: string
  keywords?: readonly string[]
  disabled?: boolean
  active?: boolean
  onSelect?: () => void
  onDoubleSelect?: () => void
}

export interface SidebarSearchFieldProps
  extends
    SidebarSharedProps,
    Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, 'class' | 'style' | 'children' | 'onInput'> {
  value: string
  placeholder?: string
  onInput: (value: string) => void
  onClear?: () => void
}

export interface SidebarRailItem {
  id: string
  label: string
  icon?: JSX.Element
  badge?: string
  title?: string
  disabled?: boolean
}

export interface SidebarRailProps extends SidebarSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  items: readonly SidebarRailItem[]
  activeItemId?: string
  readonly?: boolean
  onItemSelect?: (item: SidebarRailItem) => void
}

export interface SidebarBridge {
  sections: Accessor<readonly SidebarSectionData[]>
  activeItemId: Accessor<string | undefined>
  getItemById: (id: string) => SidebarItemData | undefined
  execute: (id: string) => boolean
}

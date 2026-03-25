import type { JSX, ParentProps } from 'solid-js'

export type PanelSectionLayout = 'list' | 'grid'
export type PanelDensity = 'comfortable' | 'compact'

export interface PanelSharedProps {
  class?: string
  style?: string
}

export interface PanelFrameProps
  extends ParentProps<PanelSharedProps>, Omit<JSX.HTMLAttributes<HTMLElement>, 'class' | 'style'> {
  readonly?: boolean
}

export interface PanelBodyProps
  extends ParentProps<PanelSharedProps>, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  stacked?: boolean
}

export interface PanelSectionData {
  id?: string
  title?: string
  description?: string
  meta?: string
  layout?: PanelSectionLayout
  collapsible?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  headerAction?: JSX.Element
  items: readonly PanelItemData[]
}

export interface PanelItemData {
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

export interface PanelSectionProps {
  section: PanelSectionData
  index: number
  activeItemId?: string
  readonly?: boolean
  emptyState?: JSX.Element
  density?: PanelDensity
  isCollapsed: (section: PanelSectionData, index: number) => boolean
  onToggleSection: (section: PanelSectionData, index: number) => void
  onItemSelect?: (item: PanelItemData, section: PanelSectionData) => void
}

export interface PanelSearchFieldProps
  extends
    PanelSharedProps,
    Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, 'class' | 'style' | 'children' | 'onInput'> {
  value: string
  placeholder?: string
  onInput: (value: string) => void
  onClear?: () => void
}

export interface PanelRailItem {
  id: string
  label: string
  icon?: JSX.Element
  badge?: string
  title?: string
  disabled?: boolean
}

export interface PanelRailProps extends PanelSharedProps, Omit<JSX.HTMLAttributes<HTMLDivElement>, 'class' | 'style'> {
  items: readonly PanelRailItem[]
  activeItemId?: string
  readonly?: boolean
  onItemSelect?: (item: PanelRailItem) => void
}

import type { JSX } from 'solid-js'

export type MenuMode = 'vertical' | 'horizontal' | 'inline'
export type MenuTheme = 'light' | 'dark'
export type MenuTriggerSubMenuAction = 'hover' | 'click'
export type MenuDataAttributeValue = string | number | boolean | undefined

export interface MenuDataAttributes {
  [key: `data-${string}`]: MenuDataAttributeValue
}

export interface MenuSharedProps {
  class?: string
  style?: string
}

export interface MenuNodeBase extends MenuDataAttributes, MenuSharedProps {
  key: string
  label?: JSX.Element
  icon?: JSX.Element
  title?: string
  disabled?: boolean
}

export interface MenuClickInfo {
  key: string
  keyPath: readonly string[]
  item: MenuItemType
  domEvent: MouseEvent
}

export interface MenuSelectInfo extends MenuClickInfo {
  selectedKeys: readonly string[]
}

export interface MenuSubMenuTitleClickInfo {
  key: string
  domEvent: MouseEvent
}

export interface MenuItemType extends MenuNodeBase {
  danger?: boolean
  extra?: JSX.Element
  href?: string
  target?: string
  rel?: string
  onClick?: (info: MenuClickInfo) => void
}

export interface MenuSubMenuType extends MenuNodeBase {
  children: readonly MenuDataItem[]
  theme?: MenuTheme
  onTitleClick?: (info: MenuSubMenuTitleClickInfo) => void
}

export interface MenuItemGroupType extends MenuDataAttributes, MenuSharedProps {
  type: 'group'
  key?: string
  label?: JSX.Element
  children?: readonly MenuDataItem[]
}

export interface MenuDividerType extends MenuDataAttributes, MenuSharedProps {
  type: 'divider'
  key?: string
  dashed?: boolean
}

export type MenuDataItem = MenuItemType | MenuSubMenuType | MenuItemGroupType | MenuDividerType | null

export interface MenuProps
  extends
    MenuSharedProps,
    Omit<JSX.HTMLAttributes<HTMLElement>, 'children' | 'class' | 'style' | 'onClick' | 'onSelect'> {
  items?: readonly MenuDataItem[]
  mode?: MenuMode
  theme?: MenuTheme
  inlineIndent?: number
  selectable?: boolean
  multiple?: boolean
  defaultSelectedKeys?: readonly string[]
  selectedKeys?: readonly string[]
  defaultOpenKeys?: readonly string[]
  openKeys?: readonly string[]
  triggerSubMenuAction?: MenuTriggerSubMenuAction
  onClick?: (info: MenuClickInfo) => void
  onSelect?: (info: MenuSelectInfo) => void
  onDeselect?: (info: MenuSelectInfo) => void
  onOpenChange?: (openKeys: readonly string[]) => void
}

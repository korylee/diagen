import type { Accessor } from 'solid-js'
import type { DesignerIconKey } from '../designerIconRegistry'

export interface ToolbarBridgeBaseItem {
  id: string
}

export interface ToolbarBridgeButtonItem extends ToolbarBridgeBaseItem {
  kind: 'button'
  text?: string
  title?: string
  iconKey?: DesignerIconKey
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
  disabled?: boolean
  width?: number | string
  execute: () => void
}

export interface ToolbarBridgeDividerItem extends ToolbarBridgeBaseItem {
  kind: 'divider'
  size?: 'normal' | 'small'
}

export interface ToolbarBridgeSpacerItem extends ToolbarBridgeBaseItem {
  kind: 'spacer'
}

export type ToolbarBridgeItem = ToolbarBridgeButtonItem | ToolbarBridgeDividerItem | ToolbarBridgeSpacerItem

export interface ToolbarBridge {
  leftItems: Accessor<readonly ToolbarBridgeItem[]>
  rightItems: Accessor<readonly ToolbarBridgeItem[]>
  getItemById: (id: string) => ToolbarBridgeItem | undefined
  execute: (id: string) => boolean
}

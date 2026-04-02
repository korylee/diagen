import type { Accessor } from 'solid-js'
import type { ResolveActionEntries, UIAction } from '../actions'

export interface ToolbarBridgeBaseItem {
  id: string
}

export type ToolbarItem = UIAction
export type ToolbarBridgeItem = ToolbarItem | '|'

export interface ToolbarBridge {
  leftItems: Accessor<readonly ToolbarBridgeItem[]>
  rightItems: Accessor<readonly ToolbarBridgeItem[]>
  getAction: (id: string) => ToolbarItem | undefined
  execute: (id: string) => boolean
}

export interface ToolbarEntries {
  left?: ResolveActionEntries<ToolbarItem>
  right?: ResolveActionEntries<ToolbarItem>
}

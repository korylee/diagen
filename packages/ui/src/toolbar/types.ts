import type { Accessor } from 'solid-js'
import type { ResolveActionEntries, UIAction } from '../actions'

export interface ToolbarBridgeBaseItem {
  id: string
}

export type ToolbarItem = UIAction
export type ToolbarExtraEntry = 'spacer'
export type ToolbarBridgeItem = ToolbarItem | '|' | ToolbarExtraEntry

export interface ToolbarBridge {
  items: Accessor<readonly ToolbarBridgeItem[]>
  getAction: (id: string) => ToolbarItem | undefined
  execute: (id: string) => boolean
}

export type ToolbarEntries = ResolveActionEntries<ToolbarItem, ToolbarExtraEntry>

import type { Accessor, JSX } from 'solid-js'
import type { ActionEntry, ResolveActionEntries, UIAction } from '../actions'

export interface ContextMenuBridge {
  items: Accessor<readonly (UIAction | '|')[]>
  getAction: (id: string) => ContextMenuItem | undefined
  execute: (id: string) => boolean
}

export interface ContextMenuPosition {
  x: number
  y: number
}

export type ContextMenuEntry = ActionEntry
export type ContextMenuItem = UIAction
export type ContextMenuEntries = ResolveActionEntries<ContextMenuItem>

export interface ContextMenuShortcutMap {
  [key: string]: JSX.Element | string | undefined
}

import type { Point } from '@diagen/shared'
import type { Accessor } from 'solid-js'
import type { ActionEntry, UIAction } from '../../actions'

export interface ContextMenuBridge {
  items: Accessor<readonly (UIAction | '|')[]>
  getAction: (id: string) => ContextMenuItem | undefined
  execute: (id: string) => boolean
}

export type ContextMenuTargetType = 'canvas' | 'shape' | 'linker' | 'selection'

export interface ContextMenuContext {
  targetType: ContextMenuTargetType
  targetId: string | null
  selectionIds: string[]
  canvasPosition: Point
}

export interface ContextMenuState {
  open: boolean
  position: Point
  context: ContextMenuContext
}

export type ContextMenuEntry = ActionEntry | ContextMenuItem
export type ContextMenuItem = UIAction
export type ContextMenuEntries =
  | readonly ContextMenuEntry[]
  | ((context: ContextMenuContext) => readonly ContextMenuEntry[])

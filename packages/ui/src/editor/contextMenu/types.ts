import type { Point } from '@diagen/shared'
import type { ActionEntry, UIAction } from '../../actions'

export type ContextMenuTargetType = 'canvas' | 'shape' | 'linker' | 'selection'

export interface ContextMenuContext {
  targetType: ContextMenuTargetType
  targetId: string | null
  selectionIds: string[]
  canvasPosition: Point
}

export interface ResolvedContextMenuAction {
  key: string
  label?: string
  icon?: UIAction['icon']
  disabled?: boolean
  danger?: boolean
  extra?: string
  children?: readonly ResolvedContextMenuEntry[]
}

export interface ResolvedContextMenuDivider {
  type: 'divider'
  key: string
}

export type ResolvedContextMenuEntry = ResolvedContextMenuAction | ResolvedContextMenuDivider

export type ContextMenuEntries =
  | readonly (ActionEntry | UIAction)[]
  | ((context: ContextMenuContext) => readonly (ActionEntry | UIAction)[])

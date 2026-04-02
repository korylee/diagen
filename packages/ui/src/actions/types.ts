import type { IconKey, Icon } from '../iconRegistry'

export interface UIAction {
  id: string
  label?: string
  title?: string
  text?: string
  icon?: IconKey | Icon | string
  shortcut?: string
  danger?: boolean
  color?: string
  dropdown?: boolean
  active?: boolean
  selected?: boolean
  width?: number | string
  isDisabled?: () => boolean
  execute?: () => void
}

export interface UIActions {
  ids: () => readonly string[]
  getAction: (id: string) => UIAction | undefined
  isDisabled: (id: string) => boolean
  execute: (id: string) => boolean
}

export type ActionEntry = string | '|'

export type ResolveActionEntries<T extends UIAction = UIAction> =
  | readonly (ActionEntry | T)[]
  | (() => readonly (ActionEntry | T)[])

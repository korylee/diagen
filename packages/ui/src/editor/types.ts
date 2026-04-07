import type { JSX } from 'solid-js'
import type { ContextMenuEntries, ContextMenuItem } from './contextMenu'

export interface EditorContextMenuOptions {
  disabled?: boolean
  entries?: ContextMenuEntries
  style?: JSX.CSSProperties
  renderIcon?: (icon: string, item: ContextMenuItem) => JSX.Element | undefined
}

export interface EditorProps {
  children?: JSX.Element
  class?: string
  style?: Record<string, string>
  shapeGuideTolerance?: number
  resizeGuideTolerance?: number
  contextMenu?: EditorContextMenuOptions
}

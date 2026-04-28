import type { RendererInteractionDefaults } from '@diagen/renderer'
import type { JSX } from 'solid-js'
import type { ContextMenuEntries, ResolvedContextMenuAction } from './contextMenu'

export interface EditorContextMenuOptions {
  disabled?: boolean
  entries?: ContextMenuEntries
  style?: JSX.CSSProperties
  renderIcon?: (icon: string, item: ResolvedContextMenuAction) => JSX.Element | undefined
}

export interface EditorProps {
  class?: string
  style?: Record<string, string>
  interaction?: Partial<RendererInteractionDefaults>
  contextMenu?: EditorContextMenuOptions
}

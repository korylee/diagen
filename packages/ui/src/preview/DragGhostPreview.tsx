import { KeyOf, Optional } from '@diagen/shared'
import { mergeProps } from 'solid-js'
import { CanvasPreview, CanvasPreviewProps } from './CanvasPreview'

const DRAG_GHOST_DEFAULTS = {
  width: 112,
  height: 72,
  accent: '#64748b',
  padding: 8,
  showText: false,
  showMarkers: false,
} as const

export interface DragGhostPreviewProps extends Optional<CanvasPreviewProps, KeyOf<typeof DRAG_GHOST_DEFAULTS>> {}

export function DragGhostPreview(props: DragGhostPreviewProps) {
  const merged = mergeProps(DRAG_GHOST_DEFAULTS, props)
  return <CanvasPreview {...merged} />
}

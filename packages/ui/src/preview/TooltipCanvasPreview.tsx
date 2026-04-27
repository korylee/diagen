import { mergeProps } from 'solid-js'
import { CanvasPreview, CanvasPreviewProps } from './CanvasPreview'
import { KeyOf, Optional } from '@diagen/shared'

const TOOLTIP_DEFAULTS = {
  width: 160,
  height: 120,
  accent: '#334155',
  padding: 12,
  showText: true,
  showMarkers: true,
} as const

export interface TooltipCanvasPreviewProps extends Optional<CanvasPreviewProps, KeyOf<typeof TOOLTIP_DEFAULTS>> {}

export function TooltipCanvasPreview(props: TooltipCanvasPreviewProps) {
  const merged = mergeProps(TOOLTIP_DEFAULTS, props)
  return <CanvasPreview {...merged} />
}

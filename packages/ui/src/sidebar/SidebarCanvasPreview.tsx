import { mergeProps } from 'solid-js'
import { CanvasPreview, CanvasPreviewProps } from '../preview/CanvasPreview'
import { KeyOf, Optional } from '@diagen/shared'

const SIDEBAR_DEFAULTS = {
  width: 64,
  height: 48,
  accent: '#475569',
  padding: 6,
  showText: false,
  showMarkers: true,
} as const

type OptionalPropKeys = KeyOf<typeof SIDEBAR_DEFAULTS>

export interface SidebarCanvasPreviewProps extends Optional<CanvasPreviewProps, OptionalPropKeys> {}

export function SidebarCanvasPreview(props: SidebarCanvasPreviewProps) {
  const merged = mergeProps(SIDEBAR_DEFAULTS, props)
  return <CanvasPreview {...merged} />
}

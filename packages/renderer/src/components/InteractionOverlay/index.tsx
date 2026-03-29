import { GuideOverlay } from './GuideOverlay'
import { LinkerOverlay } from './LinkerOverlay'
import { SelectionLayer } from './SelectionLayer'
import { type ShapeSelectionLayerProps, ShapeSelectionOverlay } from './ShapeSelectionOverlay'

export interface InteractionOverlayProps extends ShapeSelectionLayerProps {}

export function InteractionOverlay(props: InteractionOverlayProps) {
  return (
    <>
      {/* 框选层 - 用于显示框选区域 */}
      <SelectionLayer />

      {/* 指导线层 - 用于显示指导线 */}
      <GuideOverlay />

      <LinkerOverlay />

      <ShapeSelectionOverlay {...props} />
    </>
  )
}

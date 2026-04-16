import { createMemo } from 'solid-js'
import { useDesigner } from '../../context/DesignerProvider'
import { useInteraction } from '../../context/InteractionProvider'
import { RectHighlightOverlay, type RectHighlightItem } from './RectHighlightOverlay'

export function ContainerPreviewOverlay() {
  const { element, view } = useDesigner()
  const { pointer, coordinate } = useInteraction()

  const items = createMemo<RectHighlightItem[]>(() => {
    const previewParentId = pointer.shapeDrag.previewParentId()
    if (!previewParentId) return []

    const shape = element.getElementById(previewParentId)
    if (!shape || shape.type !== 'shape') return []

    return [
      {
        id: previewParentId,
        bounds: coordinate.canvasToScreen(view.getShapeBounds(shape)),
        border: '2px dashed var(--dg-selection-color)',
        background: 'color-mix(in srgb, var(--dg-selection-color) 12%, transparent)',
        radius: 6,
        dataAttrs: {
          'data-container-preview': 'true',
          'data-container-preview-id': previewParentId,
        },
      },
    ]
  })

  return <RectHighlightOverlay items={items()} visible={items().length > 0} zIndex={960} />
}

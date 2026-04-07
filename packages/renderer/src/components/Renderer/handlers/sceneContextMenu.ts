import type { Point } from '@diagen/shared'
import { hitTestScene, type SceneHit } from '../../../utils'
import { useDesigner } from '../../DesignerProvider'
import type { Interaction } from '../../InteractionProvider'

export function createSceneContextMenu(params: {
  interaction: Interaction
  onRequest?: (request: {
    event: MouseEvent
    clientPosition: Point
    canvasPosition: Point
    targetType: 'canvas' | 'shape' | 'linker' | 'selection'
    targetId: string | null
    selectionIds: string[]
  }) => void
}) {
  const { interaction, onRequest } = params
  const { pointer, coordinate } = interaction
  const { element, selection, view } = useDesigner()

  const hitScene = (point: Point): SceneHit | null =>
    hitTestScene(element.elements(), point, {
      zoom: view.viewport().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })

  return (event: MouseEvent): void => {
    if (!onRequest) return

    event.preventDefault()

    if (!pointer.machine.isIdle()) {
      return
    }

    const canvasPosition = coordinate.eventToCanvas(event)
    const sceneHit = hitScene(canvasPosition)
    const currentSelectionIds = selection.selectedIds()
    let targetType: 'canvas' | 'shape' | 'linker' | 'selection' = 'canvas'
    let targetId: string | null = null
    let selectionIds = currentSelectionIds

    if (sceneHit) {
      const hitId = sceneHit.element.id
      const isSelected = selection.isSelected(hitId)

      // Keep right-click behavior aligned with common editors:
      // focus the clicked element before building the menu context.
      if (!isSelected) {
        selection.replace([hitId])
        selectionIds = [hitId]
      }

      targetId = hitId
      targetType = isSelected && selectionIds.length > 1 ? 'selection' : sceneHit.type
    }

    // Emit a normalized menu context so the renderer only resolves intent,
    // while UI components remain responsible for presentation.
    onRequest({
      event,
      clientPosition: {
        x: event.clientX,
        y: event.clientY,
      },
      canvasPosition,
      targetType,
      targetId,
      selectionIds,
    })
  }
}

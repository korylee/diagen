import { DesignerToolState, Schema } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { hitTestScene, type SceneHit } from '../../../utils'
import { useDesigner } from '../../DesignerProvider'
import { Interaction } from '../../InteractionProvider'

function getIntent(params: { tool: DesignerToolState; point: Point; sceneHit: SceneHit | null }) {
  const { tool, point, sceneHit } = params

  if (tool.type === 'create-shape') {
    return {
      type: 'create-shape',
      point,
      shapeId: tool.shapeId,
      continuous: tool.continuous,
    } as const
  }

  if (tool.type === 'create-linker') {
    return {
      type: 'create-linker',
      point,
      linkerId: tool.linkerId,
      continuous: tool.continuous,
      sceneHit,
    } as const
  }

  if (sceneHit?.type === 'linker') {
    return {
      type: 'edit-linker',
      point,
      sceneHit,
    } as const
  }

  if (sceneHit?.type === 'shape') {
    return {
      type: 'interact-shape',
      point,
      shapeId: sceneHit.element.id,
    } as const
  }

  return { type: 'blank' } as const
}

type Intent = ReturnType<typeof getIntent>

export function createSceneDown(interaction: Interaction) {
  const { element, selection, edit, view, tool } = useDesigner()
  const { pointer, coordinate } = interaction

  const selectByEvent = (id: string, event: MouseEvent): void => {
    if (event.ctrlKey || event.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
      return
    }

    selection.replace([id])
  }

  const onCreateShapeDown = (event: MouseEvent, intent: Extract<Intent, { type: 'create-shape' }>): boolean => {
    const { shapeId, continuous, point } = intent
    const definition = Schema.getShape(shapeId)
    if (!definition) return false

    const width = definition.props.w
    const height = definition.props.h
    const shape = Schema.createShape(shapeId, {
      x: Math.round(point.x - width / 2),
      y: Math.round(point.y - height / 2),
      w: width,
      h: height,
      angle: 0,
    })
    if (!shape) return false

    event.stopPropagation()
    event.preventDefault()

    edit.add([shape])
    selection.replace([shape.id])
    view.scheduleAutoGrow(view.getShapeBounds(shape))
    view.flushAutoGrow()

    if (!continuous) {
      tool.setIdle()
    }

    return true
  }

  const onCreateLinkerDown = (event: MouseEvent, intent: Extract<Intent, { type: 'create-linker' }>): boolean => {
    const { point, linkerId, continuous, sceneHit } = intent
    event.stopPropagation()
    event.preventDefault()

    const started =
      sceneHit?.type === 'shape'
        ? pointer.machine.beginLinkerCreate(event, {
            linkerId,
            from: {
              type: 'shape',
              shapeId: sceneHit.element.id,
            },
          })
        : pointer.machine.beginLinkerCreate(event, {
            linkerId,
            from: {
              type: 'point',
              point,
            },
          })

    if (started && !continuous) {
      tool.setIdle()
    }

    return started
  }

  const onLinkerDown = (event: MouseEvent, intent: Extract<Intent, { type: 'edit-linker' }>): boolean => {
    const { point, sceneHit } = intent
    event.stopPropagation()
    event.preventDefault()
    selectByEvent(sceneHit.element.id, event)
    return pointer.machine.beginLinkerEdit(event, {
      linkerId: sceneHit.element.id,
      point,
      hit: sceneHit.hit,
      route: sceneHit.route,
    })
  }

  const onShapeDown = (event: MouseEvent, intent: Extract<Intent, { type: 'interact-shape' }>): boolean => {
    const { point, shapeId } = intent
    event.stopPropagation()
    event.preventDefault()

    const resizeHit = pointer.resize.hitTest(point)
    if (resizeHit) {
      return pointer.machine.startResize(resizeHit.id, resizeHit.dir, event)
    }

    selectByEvent(shapeId, event)
    return pointer.machine.startShapeDrag(event)
  }

  const onBlankDown = (event: MouseEvent): boolean => {
    event.stopPropagation()
    event.preventDefault()
    selection.clear()
    return pointer.machine.startBoxSelect(event)
  }

  const hitScene = (point: Point): SceneHit | null =>
    hitTestScene(element.elements(), point, {
      zoom: view.viewport().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })

  const downMap = {
    'create-shape': onCreateShapeDown,
    'create-linker': onCreateLinkerDown,
    'edit-linker': onLinkerDown,
    'interact-shape': onShapeDown,
    blank: onBlankDown,
  } as const

  return (event: MouseEvent): boolean => {
    if (event.button !== 0) return false
    if (!pointer.machine.isIdle()) return false

    const currentTool = tool.toolState()
    const point = coordinate.eventToCanvas(event)
    const sceneHit = currentTool.type === 'create-shape' ? null : hitScene(point)
    const intent = getIntent({
      tool: currentTool,
      point,
      sceneHit,
    })

    const down = downMap[intent.type]
    if (!down) return false
    return down(event, intent as never)
  }
}

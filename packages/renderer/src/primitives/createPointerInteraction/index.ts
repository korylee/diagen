import { createInteractionMachine } from './createInteractionMachine'
import { createLinkerDrag } from './interactions/createLinkerDrag'
import { createPan } from './interactions/createPan'
import { createResize } from './interactions/createResize'
import { createRotate } from './interactions/createRotate'
import { createSelection } from './interactions/createSelection'
import { createShapeDrag } from './interactions/createShapeDrag'
import type { CoordinateService } from '../createCoordinateService'

export interface CreatePointerInteractionOptions {
  coordinate: CoordinateService
  panButton?: number
  shapeDragThreshold?: number
  shapeGuideTolerance?: number
  linkerDragThreshold?: number
  linkerSnapDistance?: number
  linkerSnapOnMove?: boolean
  linkerSnapStickDistance?: number
  linkerDirectionBias?: number
  linkerAllowSelfConnect?: boolean
  resizeMinWidth?: number
  resizeMinHeight?: number
  resizeGuideTolerance?: number
  boxSelectMinSize?: number
  rotateThreshold?: number
  rotateSnapStep?: number
}

/**
 * 指针交互编排层：
 * - 统一持有坐标服务和交互状态机
 * - 内部组合所有鼠标相关 primitive
 */
export function createPointerInteraction(options: CreatePointerInteractionOptions) {
  const {
    coordinate,
    panButton = 1,
    shapeDragThreshold = 3,
    shapeGuideTolerance,
    linkerDragThreshold = 3,
    linkerSnapDistance = 12,
    linkerSnapOnMove = true,
    linkerSnapStickDistance = 8,
    linkerDirectionBias = 0.35,
    linkerAllowSelfConnect = true,
    resizeMinWidth = 20,
    resizeMinHeight = 20,
    resizeGuideTolerance,
    boxSelectMinSize = 5,
    rotateThreshold = 2,
    rotateSnapStep = 15,
  } = options

  const shapeDrag = createShapeDrag({
    threshold: shapeDragThreshold,
    eventToCanvas: coordinate.eventToCanvas,
    guideTolerance: shapeGuideTolerance,
  })
  const linkerDrag = createLinkerDrag({
    threshold: linkerDragThreshold,
    eventToCanvas: coordinate.eventToCanvas,
    snapDistance: linkerSnapDistance,
    snapOnMove: linkerSnapOnMove,
    snapStickDistance: linkerSnapStickDistance,
    directionBias: linkerDirectionBias,
    allowSelfConnect: linkerAllowSelfConnect,
  })
  const pan = createPan({ button: panButton })
  const resize = createResize({
    minWidth: resizeMinWidth,
    minHeight: resizeMinHeight,
    eventToCanvas: coordinate.eventToCanvas,
    guideTolerance: resizeGuideTolerance,
  })
  const rotate = createRotate({
    threshold: rotateThreshold,
    eventToCanvas: coordinate.eventToCanvas,
    snapStep: rotateSnapStep,
  })
  const boxSelect = createSelection({ minSize: boxSelectMinSize })

  const machine = createInteractionMachine({
    pan,
    shapeDrag,
    linkerDrag,
    resize,
    rotate,
    boxSelect,
    eventToCanvas: coordinate.eventToCanvas,
  })

  return {
    machine,
    pan,
    shapeDrag,
    linkerDrag,
    resize,
    rotate,
    boxSelect,
  }
}

export type CreatePointerInteraction = ReturnType<typeof createPointerInteraction>

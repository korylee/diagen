import { createPointerMachine } from './machine'
import { createLinkerDrag } from './linker/createLinkerDrag'
import { createPan } from './viewport/createPan'
import { createResize } from './shape/createResize'
import { createRotate } from './shape/createRotate'
import { createBoxSelection } from './viewport/createBoxSelection'
import { createShapeDrag } from './shape/createShapeDrag'
import type { CoordinateService } from '../services/createCoordinateService'
import { RENDERER_DEFAULTS } from '../../defaults'

export interface CreatePointerInteractionOptions {
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
 * - 内部组合所有鼠标相关交互模块
 */
export function createPointerInteraction(coordinate: CoordinateService, options: CreatePointerInteractionOptions = {}) {
  const defaultInteraction = RENDERER_DEFAULTS.interaction
  const {
    panButton = defaultInteraction.panButton,
    shapeDragThreshold = defaultInteraction.shapeDragThreshold,
    shapeGuideTolerance,
    linkerDragThreshold = defaultInteraction.linkerDragThreshold,
    linkerSnapDistance = defaultInteraction.linkerSnapDistance,
    linkerSnapOnMove = defaultInteraction.linkerSnapOnMove,
    linkerSnapStickDistance = defaultInteraction.linkerSnapStickDistance,
    linkerDirectionBias = defaultInteraction.linkerDirectionBias,
    linkerAllowSelfConnect = defaultInteraction.linkerAllowSelfConnect,
    resizeMinWidth = defaultInteraction.resizeMinWidth,
    resizeMinHeight = defaultInteraction.resizeMinHeight,
    resizeGuideTolerance,
    boxSelectMinSize = defaultInteraction.boxSelectMinSize,
    rotateThreshold = defaultInteraction.rotateThreshold,
    rotateSnapStep = defaultInteraction.rotateSnapStep,
  } = options

  const shapeDrag = createShapeDrag(coordinate, {
    threshold: shapeDragThreshold,
    guideTolerance: shapeGuideTolerance,
  })
  const linkerDrag = createLinkerDrag(coordinate, {
    threshold: linkerDragThreshold,
    snapDistance: linkerSnapDistance,
    snapOnMove: linkerSnapOnMove,
    snapStickDistance: linkerSnapStickDistance,
    directionBias: linkerDirectionBias,
    allowSelfConnect: linkerAllowSelfConnect,
  })
  const pan = createPan({ button: panButton })
  const resize = createResize(coordinate, {
    minWidth: resizeMinWidth,
    minHeight: resizeMinHeight,
    guideTolerance: resizeGuideTolerance,
  })
  const rotate = createRotate(coordinate, {
    threshold: rotateThreshold,
    snapStep: rotateSnapStep,
  })
  const boxSelect = createBoxSelection({ minSize: boxSelectMinSize })

  const machine = createPointerMachine({
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

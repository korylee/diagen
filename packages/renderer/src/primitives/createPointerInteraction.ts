import type { Viewport } from '@diagen/core'
import { createCoordinateService } from '../utils/coordinate'
import { createInteractionMachine } from './createInteractionMachine'
import { createLinkerDrag } from './createLinkerDrag'
import { createPan } from './createPan'
import { createResize } from './createResize'
import { createRotate } from './createRotate'
import { createSelection } from './createSelection'
import { createShapeDrag } from './createShapeDrag'

export interface CreatePointerInteractionOptions {
  getViewport: () => Viewport
  getViewportElement: () => HTMLDivElement | null
  getSceneLayerElement: () => HTMLDivElement | null
  panButton?: number
  shapeDragThreshold?: number
  linkerDragThreshold?: number
  linkerSnapDistance?: number
  linkerSnapOnMove?: boolean
  linkerAllowSelfConnect?: boolean
  resizeMinWidth?: number
  resizeMinHeight?: number
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
    getViewport,
    getViewportElement,
    getSceneLayerElement,
    panButton = 1,
    shapeDragThreshold = 3,
    linkerDragThreshold = 3,
    linkerSnapDistance = 12,
    linkerSnapOnMove = true,
    linkerAllowSelfConnect = true,
    resizeMinWidth = 20,
    resizeMinHeight = 20,
    boxSelectMinSize = 5,
    rotateThreshold = 2,
    rotateSnapStep = 15,
  } = options

  const coordinate = createCoordinateService({
    getViewport,
    getViewportElement,
    getSceneLayerElement,
  })

  const shapeDrag = createShapeDrag({
    threshold: shapeDragThreshold,
    eventToCanvas: coordinate.eventToCanvas,
  })
  const linkerDrag = createLinkerDrag({
    threshold: linkerDragThreshold,
    eventToCanvas: coordinate.eventToCanvas,
    snapDistance: linkerSnapDistance,
    snapOnMove: linkerSnapOnMove,
    allowSelfConnect: linkerAllowSelfConnect,
  })
  const pan = createPan({ button: panButton })
  const resize = createResize({
    minWidth: resizeMinWidth,
    minHeight: resizeMinHeight,
    eventToCanvas: coordinate.eventToCanvas,
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
    coordinate,
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

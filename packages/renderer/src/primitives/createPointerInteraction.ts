import type { Viewport } from '@diagen/core'
import { createCoordinateService } from '../utils/coordinate'
import { createInteractionMachine } from './createInteractionMachine'
import { createLinkerDrag } from './createLinkerDrag'
import { createPan } from './createPan'
import { createResize } from './createResize'
import { createSelection } from './createSelection'
import { createShapeDrag } from './createShapeDrag'

export interface CreatePointerInteractionOptions {
  getViewport: () => Viewport
  getViewportElement: () => HTMLDivElement | null
  getSceneLayerElement: () => HTMLDivElement | null
  panButton?: number
  shapeDragThreshold?: number
  linkerDragThreshold?: number
  resizeMinWidth?: number
  resizeMinHeight?: number
  boxSelectMinSize?: number
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
    resizeMinWidth = 20,
    resizeMinHeight = 20,
    boxSelectMinSize = 5,
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
  })
  const pan = createPan({ button: panButton })
  const resize = createResize({
    minWidth: resizeMinWidth,
    minHeight: resizeMinHeight,
    eventToCanvas: coordinate.eventToCanvas,
  })
  const boxSelect = createSelection({ minSize: boxSelectMinSize })

  const machine = createInteractionMachine({
    pan,
    shapeDrag,
    linkerDrag,
    resize,
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
    boxSelect,
  }
}

export type CreatePointerInteraction = ReturnType<typeof createPointerInteraction>


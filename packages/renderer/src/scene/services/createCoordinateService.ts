import { createElementRect } from '@diagen/primitives'
import type { Bounds, Point } from '@diagen/shared'
import type { Accessor } from 'solid-js'

export type EventToCanvas = (event: { clientX: number; clientY: number }) => Point
type CoordinateTransform = <T extends Point | Bounds>(value: T) => T extends Bounds ? Bounds : Point

export interface CreateCoordinateServiceOptions {
  viewportRef: Accessor<HTMLDivElement | null>
  sceneLayerRef: Accessor<HTMLDivElement | null>
  screenToCanvas: CoordinateTransform
  canvasToScreen: CoordinateTransform
}

/**
 * 统一坐标转换服务：
 * - DOM 读取集中在容器层
 * - 交互与 services 仅依赖转换接口
 */
export function createCoordinateService(options: CreateCoordinateServiceOptions) {
  const { sceneLayerRef, viewportRef, screenToCanvas, canvasToScreen } = options
  const { rect: viewportRect } = createElementRect(viewportRef)

  const eventToScreen = (event: { clientX: number; clientY: number }): Point => {
    const sceneLayerElement = sceneLayerRef()
    if (sceneLayerElement) {
      const rect = sceneLayerElement.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const viewportEl = viewportRef()
    if (!viewportEl) return { x: 0, y: 0 }
    const rect = viewportRect()
    return {
      x: event.clientX - rect.left + viewportEl.scrollLeft,
      y: event.clientY - rect.top + viewportEl.scrollTop,
    }
  }

  const eventToCanvas: EventToCanvas = event => {
    return screenToCanvas(eventToScreen(event))
  }

  return {
    viewportRect,

    eventToCanvas,
    eventToScreen,
    canvasToScreen,
    screenToCanvas,
  }
}

export type CoordinateService = ReturnType<typeof createCoordinateService>

import { canvasToScreen, screenToCanvas, type Viewport } from '@diagen/core'
import type { Bounds, Point } from '@diagen/shared'

export type EventToCanvas = (event: { clientX: number; clientY: number }) => Point

export interface CoordinateService {
  eventToCanvas: EventToCanvas
  eventToScreen: (event: { clientX: number; clientY: number }) => Point
  canvasToScreen: <T extends Point | Bounds>(value: T) => T extends Bounds ? Bounds : Point
  screenToCanvas: <T extends Point | Bounds>(value: T) => T extends Bounds ? Bounds : Point
  getViewportRect: () => DOMRect | null
}

export interface CreateCoordinateServiceOptions {
  getViewport: () => Viewport
  getViewportElement: () => HTMLDivElement | null
  getSceneLayerElement: () => HTMLDivElement | null
}

/**
 * 统一坐标转换服务：
 * - DOM 读取集中在容器层
 * - 交互与 primitives 仅依赖转换接口
 */
export function createCoordinateService(options: CreateCoordinateServiceOptions): CoordinateService {
  const { getViewport, getViewportElement, getSceneLayerElement } = options

  const eventToScreen = (event: { clientX: number; clientY: number }): Point => {
    const sceneLayerElement = getSceneLayerElement()
    if (sceneLayerElement) {
      const rect = sceneLayerElement.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    }

    const viewportElement = getViewportElement()
    if (!viewportElement) return { x: 0, y: 0 }
    const rect = viewportElement.getBoundingClientRect()
    return {
      x: event.clientX - rect.left + viewportElement.scrollLeft,
      y: event.clientY - rect.top + viewportElement.scrollTop,
    }
  }

  const screenToCanvasValue = <T extends Point | Bounds>(value: T): T extends Bounds ? Bounds : Point => {
    return screenToCanvas(value, getViewport()) as T extends Bounds ? Bounds : Point
  }

  const canvasToScreenValue = <T extends Point | Bounds>(value: T): T extends Bounds ? Bounds : Point => {
    return canvasToScreen(value, getViewport()) as T extends Bounds ? Bounds : Point
  }

  const eventToCanvas: EventToCanvas = event => {
    return screenToCanvasValue(eventToScreen(event))
  }

  const getViewportRect = (): DOMRect | null => {
    const viewportElement = getViewportElement()
    return viewportElement ? viewportElement.getBoundingClientRect() : null
  }

  return {
    eventToCanvas,
    eventToScreen,
    canvasToScreen: canvasToScreenValue,
    screenToCanvas: screenToCanvasValue,
    getViewportRect,
  }
}


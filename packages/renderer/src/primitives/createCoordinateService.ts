import { canvasToScreen, screenToCanvas, type Viewport } from '@diagen/core'
import { createElementRect } from '@diagen/primitives'
import type { Bounds, Point } from '@diagen/shared'
import { Accessor } from 'solid-js'

export type EventToCanvas = (event: { clientX: number; clientY: number }) => Point

export interface CreateCoordinateServiceOptions {
  getViewport: () => Viewport
  viewportRef: Accessor<HTMLDivElement | null>
  sceneLayerRef: Accessor<HTMLDivElement | null>
}

/**
 * 统一坐标转换服务：
 * - DOM 读取集中在容器层
 * - 交互与 primitives 仅依赖转换接口
 */
export function createCoordinateService(options: CreateCoordinateServiceOptions) {
  const { getViewport, sceneLayerRef, viewportRef } = options
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

  const screenToCanvasValue = <T extends Point | Bounds>(value: T): T extends Bounds ? Bounds : Point => {
    return screenToCanvas(value, getViewport()) as T extends Bounds ? Bounds : Point
  }

  const canvasToScreenValue = <T extends Point | Bounds>(value: T): T extends Bounds ? Bounds : Point => {
    return canvasToScreen(value, getViewport()) as T extends Bounds ? Bounds : Point
  }

  const eventToCanvas: EventToCanvas = event => {
    return screenToCanvasValue(eventToScreen(event))
  }

  return {
    eventToCanvas,
    eventToScreen,
    canvasToScreen: canvasToScreenValue,
    screenToCanvas: screenToCanvasValue,
    viewportRect,
  }
}

export type CoordinateService = ReturnType<typeof createCoordinateService>

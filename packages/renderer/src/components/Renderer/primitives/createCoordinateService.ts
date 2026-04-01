import { createElementRect } from '@diagen/primitives'
import type { Point } from '@diagen/shared'
import type { Accessor } from 'solid-js'
import { useDesigner } from '../..'

export type EventToCanvas = (event: { clientX: number; clientY: number }) => Point

export interface CreateCoordinateServiceOptions {
  viewportRef: Accessor<HTMLDivElement | null>
  sceneLayerRef: Accessor<HTMLDivElement | null>
}

/**
 * 统一坐标转换服务：
 * - DOM 读取集中在容器层
 * - 交互与 primitives 仅依赖转换接口
 */
export function createCoordinateService(options: CreateCoordinateServiceOptions) {
  const { view } = useDesigner()
  const { sceneLayerRef, viewportRef } = options
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
    return view.toCanvas(eventToScreen(event))
  }

  return {
    viewportRect,

    eventToCanvas,
    eventToScreen,
    canvasToScreen: view.toScreen,
    screenToCanvas: view.toCanvas,
  }
}

export type CoordinateService = ReturnType<typeof createCoordinateService>

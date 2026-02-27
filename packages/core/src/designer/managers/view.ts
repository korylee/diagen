import { DesignerContext } from './types'
import { Point } from '@diagen/shared'
import { isShape } from '../../model'
import type { ElementManager } from './element'
import { createMemo } from 'solid-js'

export function createViewManager(ctx: DesignerContext, deps: { element: ElementManager }) {
  const { state, setState } = ctx
  const { element } = deps

  const viewport = createMemo(() => state.viewport)
  const canvasSize = createMemo(() => state.canvasSize)

  function setZoom(zoom: number, center?: Point): void {
    const minZoom = 0.1
    const maxZoom = 5
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom))

    if (center) {
      const oldZoom = viewport().zoom
      const scale = newZoom / oldZoom

      setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - viewport().x) * scale,
        y: center.y - (center.y - viewport().y) * scale,
      })
    } else {
      setState('viewport', 'zoom', newZoom)
    }
  }

  function setPan(x: number, y: number): void {
    setState('viewport', { x, y })
  }

  function pan(deltaX: number, deltaY: number): void {
    setPan(viewport().x + deltaX, viewport().y + deltaY)
  }

  /**
   * Screen coordinate to Canvas (World) coordinate
   */
  function toWorld(point: Point): Point {
    const { x, y, zoom } = viewport()
    return {
      x: (point.x - x) / zoom,
      y: (point.y - y) / zoom,
    }
  }

  /**
   * Canvas (World) coordinate to Screen coordinate
   */
  function toScreen(point: Point): Point {
    const { x, y, zoom } = viewport()
    return {
      x: point.x * zoom + x,
      y: point.y * zoom + y,
    }
  }

  /**
   * Zoom to a specific area
   */
  function zoomToRect(rect: { x: number; y: number; w: number; h: number }, padding = 50): void {
    const viewportWidth = canvasSize().width
    const viewportHeight = canvasSize().height

    const zoomX = (viewportWidth - padding * 2) / rect.w
    const zoomY = (viewportHeight - padding * 2) / rect.h
    const newZoom = Math.max(0.1, Math.min(5, Math.min(zoomX, zoomY)))

    setState('viewport', {
      zoom: newZoom,
      x: (viewportWidth - rect.w * newZoom) / 2 - rect.x * newZoom,
      y: (viewportHeight - rect.h * newZoom) / 2 - rect.y * newZoom,
    })
  }

  /**
   * Center the viewport to a point
   */
  function centerTo(point: Point): void {
    const viewportWidth = canvasSize().width
    const viewportHeight = canvasSize().height
    const { zoom } = state.viewport

    setState('viewport', {
      x: viewportWidth / 2 - point.x * zoom,
      y: viewportHeight / 2 - point.y * zoom,
    })
  }

  function zoomToFit(padding = 50): void {
    const els = element.elements().filter(isShape)

    if (els.length === 0) {
      setZoom(1)
      return
    }

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const el of els) {
      const { x, y, w, h } = el.props
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const viewportWidth = canvasSize().width
    const viewportHeight = canvasSize().height

    const zoomX = (viewportWidth - padding * 2) / contentWidth
    const zoomY = (viewportHeight - padding * 2) / contentHeight
    const newZoom = Math.min(zoomX, zoomY, 1)

    setState('viewport', {
      zoom: newZoom,
      x: (viewportWidth - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (viewportHeight - contentHeight * newZoom) / 2 - minY * newZoom,
    })
  }

  function zoomIn(): void {
    setZoom(viewport().zoom * 1.2)
  }

  function zoomOut(): void {
    setZoom(viewport().zoom / 1.2)
  }

  function setCanvasSize(width: number, height: number) {
    setState('canvasSize', { width, height })
  }

  return {
    viewport,
    canvasSize,

    setZoom,
    setPan,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToRect,
    pan,
    centerTo,
    toWorld,
    toScreen,
    setCanvasSize,
  }
}

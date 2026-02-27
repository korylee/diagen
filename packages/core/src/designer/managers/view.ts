import { DesignerContext } from './types'
import { Point, Rect } from '@diagen/shared'
import { isShape } from '../../model'
import type { ElementManager } from './element'
import { createMemo } from 'solid-js'
import { canvasToScreen, screenToCanvas } from '../../utils'

/** 视图管理器 */
export function createViewManager(ctx: DesignerContext, deps: { element: ElementManager }) {
  const { state, setState } = ctx
  const { element } = deps

  const viewport = createMemo(() => state.viewport)
  const zoom = createMemo(() => viewport().zoom)
  const diagramPage = createMemo(() => state.diagram.page)

  function setZoom(val: number, center?: Point): void {
    const minZoom = 0.1
    const maxZoom = 5
    const newZoom = Math.max(minZoom, Math.min(maxZoom, val))

    if (center) {
      const oldZoom = zoom()
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

  /** 屏幕坐标 → 画布坐标 */
  function toCanvas(point: Point): Point {
    return screenToCanvas(point, viewport())
  }

  /** 画布坐标 → 屏幕坐标 */
  function toScreen(point: Point): Point {
    return canvasToScreen(point, viewport())
  }

  function zoomToRect(rect: Rect): void {
    const { width, height } = diagramPage()
    const zoomX = (width) / rect.w
    const zoomY = (height) / rect.h
    const newZoom = Math.max(0.1, Math.min(5, Math.min(zoomX, zoomY)))

    setState('viewport', {
      zoom: newZoom,
      x: (width - rect.w * newZoom) / 2 - rect.x * newZoom,
      y: (height - rect.h * newZoom) / 2 - rect.y * newZoom,
    })
  }

  function centerTo(point: Point): void {
    const { width, height } = diagramPage()
    setState('viewport', {
      x: width / 2 - point.x * zoom(),
      y: height / 2 - point.y * zoom(),
    })
  }

  function zoomToFit(): void {
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
    const { width, height } = diagramPage()
    const zoomX = (width) / contentWidth
    const zoomY = (height) / contentHeight
    const newZoom = Math.min(zoomX, zoomY, 1)

    setState('viewport', {
      zoom: newZoom,
      x: (width - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (height - contentHeight * newZoom) / 2 - minY * newZoom,
    })
  }

  function zoomIn(): void {
    setZoom(zoom() * 1.2)
  }
  function zoomOut(): void {
    setZoom(zoom() / 1.2)
  }

  function setPageSize(width: number, height: number): void {
    setState('diagram', 'page', { width, height })
  }

  return {
    page: diagramPage,
    viewport,
    zoom,

    setZoom,
    setPan,
    zoomIn,
    zoomOut,
    zoomToFit,
    zoomToRect,
    pan,
    centerTo,
    toCanvas,
    toScreen,
    setPageSize,
  }
}

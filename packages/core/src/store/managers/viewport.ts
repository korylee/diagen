import { StoreContext } from './types'
import { Point } from '@diagen/shared'
import { isShape } from '../../model'
import type { ElementManager } from './element'

export function createViewportManager(ctx: StoreContext, deps: { element: ElementManager }) {
  const { state, setState } = ctx
  const { element } = deps

  function setZoom(zoom: number, center?: Point): void {
    const minZoom = 0.1
    const maxZoom = 5
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom))

    if (center) {
      const oldZoom = state.viewport.zoom
      const scale = newZoom / oldZoom

      setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - state.viewport.x) * scale,
        y: center.y - (center.y - state.viewport.y) * scale,
      })
    } else {
      setState('viewport', 'zoom', newZoom)
    }
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
    const viewportWidth = state.canvasSize.width
    const viewportHeight = state.canvasSize.height

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
    setZoom(state.viewport.zoom + 0.1)
  }

  function zoomOut(): void {
    setZoom(state.viewport.zoom - 0.1)
  }

  function pan(deltaX: number, deltaY: number): void {
    setState('viewport', {
      x: state.viewport.x + deltaX,
      y: state.viewport.y + deltaY,
    })
  }

  return {
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    pan,
  }
}

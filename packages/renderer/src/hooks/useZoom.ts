import { createSignal } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'
import { calculateZoomToFit, clampZoom, DEFAULT_MAX_ZOOM, DEFAULT_MIN_ZOOM } from '@diagen/core'

interface UseZoomOptions {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  onChange?: (zoom: number, center?: Point) => void
}

export function useZoom(initialZoom: number = 1, options: UseZoomOptions = {}) {
  const { minZoom = DEFAULT_MIN_ZOOM, maxZoom = DEFAULT_MAX_ZOOM, zoomStep = 0.1 } = options

  const [zoom, setZoomState] = createSignal(initialZoom)

  const setZoom = (newZoom: number, center?: Point) => {
    const clampedZoom = clampZoom(newZoom, minZoom, maxZoom)
    setZoomState(clampedZoom)
    options.onChange?.(clampedZoom, center)
  }

  const zoomIn = (center?: Point) => {
    setZoom(zoom() + zoomStep, center)
  }

  const zoomOut = (center?: Point) => {
    setZoom(zoom() - zoomStep, center)
  }

  const reset = () => {
    setZoom(1)
  }

  const zoomToFit = (contentBounds: Rect, viewportSize: Rect, padding = 50) => {
    const newZoom = calculateZoomToFit(contentBounds, viewportSize, padding)
    setZoom(newZoom)
  }

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    reset,
  }
}

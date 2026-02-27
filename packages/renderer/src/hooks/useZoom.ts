import { createSignal, onMount, onCleanup } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'
import { clampZoom, DEFAULT_MIN_ZOOM, DEFAULT_MAX_ZOOM, calculateZoomToFit } from '@diagen/core'

export interface UseZoomOptions {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  onChange?: (zoom: number, center?: Point) => void
}

export interface UseZoomReturn {
  zoom: () => number
  setZoom: (zoom: number, center?: Point) => void
  zoomIn: (center?: Point) => void
  zoomOut: (center?: Point) => void
  zoomToFit: (contentBounds: Rect, viewportSize: Rect, padding?: number) => void
  reset: () => void
}

export function useZoom(
  initialZoom: number = 1,
  options: UseZoomOptions = {}
): UseZoomReturn {
  const {
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    zoomStep = 0.1
  } = options

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
    reset
  }
}

export interface UseWheelZoomOptions {
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
  onChange?: (zoom: number, center: Point) => void
}

export function useWheelZoom(options: UseWheelZoomOptions = {}) {
  const {
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    zoomStep = 0.1
  } = options

  const handleWheel = (e: WheelEvent, currentZoom: number): { zoom: number; center: Point } => {
    e.preventDefault()
    const center: Point = { x: e.clientX, y: e.clientY }
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep
    const newZoom = clampZoom(currentZoom + delta, minZoom, maxZoom)
    return { zoom: newZoom, center }
  }

  return { handleWheel }
}

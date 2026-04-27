import type { Bounds, Point } from '@diagen/shared'

export interface PreviewViewport {
  width: number
  height: number
  padding?: number
}

export interface PreviewFrame {
  scale: number
  offsetX: number
  offsetY: number
  drawWidth: number
  drawHeight: number
}

export function resolvePreviewScale(bounds: Bounds, viewport: PreviewViewport): number {
  const availableWidth = Math.max(viewport.width - (viewport.padding ?? 0) * 2, 1)
  const availableHeight = Math.max(viewport.height - (viewport.padding ?? 0) * 2, 1)
  const sourceWidth = Math.max(bounds.w, 1)
  const sourceHeight = Math.max(bounds.h, 1)

  return Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight)
}

export function resolvePreviewOffset(bounds: Bounds, viewport: PreviewViewport, scale: number) {
  const drawWidth = bounds.w * scale
  const drawHeight = bounds.h * scale

  return {
    offsetX: (viewport.width - drawWidth) / 2 - bounds.x * scale,
    offsetY: (viewport.height - drawHeight) / 2 - bounds.y * scale,
  }
}

export function fitBoundsToViewport(bounds: Bounds, viewport: PreviewViewport): PreviewFrame {
  const scale = resolvePreviewScale(bounds, viewport)
  const { offsetX, offsetY } = resolvePreviewOffset(bounds, viewport, scale)

  return {
    scale,
    offsetX,
    offsetY,
    drawWidth: bounds.w * scale,
    drawHeight: bounds.h * scale,
  }
}

export function resolvePreviewBounds(points: Point[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  }
}

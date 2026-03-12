import type { Bounds } from '@diagen/shared'

export interface RotatableBounds {
  x: number
  y: number
  w: number
  h: number
  angle?: number
}

export function getRotatedBoxBounds(bounds: RotatableBounds): Bounds {
  const { x, y, w, h, angle = 0 } = bounds
  if (!angle) {
    return { x, y, w, h }
  }

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = x + w / 2
  const cy = y + h / 2

  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const corner of corners) {
    const dx = corner.x - cx
    const dy = corner.y - cy
    const rx = cx + dx * cos - dy * sin
    const ry = cy + dx * sin + dy * cos
    minX = Math.min(minX, rx)
    minY = Math.min(minY, ry)
    maxX = Math.max(maxX, rx)
    maxY = Math.max(maxY, ry)
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  }
}


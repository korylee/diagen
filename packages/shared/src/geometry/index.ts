export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Box {
  w: number
  h: number
}

export interface Bounds extends Point, Box {}

export interface RotatableBounds extends Bounds {
  angle?: number
}

export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function isSamePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6
}

export function isPointInBounds(point: Point, b: Bounds): boolean {
  return point.x >= b.x && point.x <= b.x + b.w && point.y >= b.y && point.y <= b.y + b.h
}

function toRadians(angle: number): number {
  return (angle * Math.PI) / 180
}

export function isPointInRotatedBounds(point: Point, b: Bounds, angle: number): boolean {
  if (angle === 0) return isPointInBounds(point, b)

  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  const px = point.x - cx
  const py = point.y - cy

  const rad = toRadians(-angle)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = px * cos - py * sin
  const ry = px * sin + py * cos

  return rx >= -b.w / 2 && rx <= b.w / 2 && ry >= -b.h / 2 && ry <= b.h / 2
}

export function getRotatedBounds(bounds: RotatableBounds): Bounds {
  const { x, y, w, h, angle = 0 } = bounds
  if (!angle) {
    return { x, y, w, h }
  }

  const rad = toRadians(angle)
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

export function boundsCenter(b: Bounds): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

export function normalizeBounds(bounds: Bounds): Bounds {
  let { x, y, w, h } = bounds
  if (w < 0) {
    x += w
    w = -w
  }
  if (h < 0) {
    y += h
    h = -h
  }
  return { x, y, w, h }
}

export function unionBounds(rect1: Bounds, rect2: Bounds): Bounds {
  const x = Math.min(rect1.x, rect2.x)
  const y = Math.min(rect1.y, rect2.y)
  return {
    x,
    y,
    w: Math.max(rect1.x + rect1.w, rect2.x + rect2.w) - x,
    h: Math.max(rect1.y + rect1.h, rect2.y + rect2.h) - y,
  }
}

export function getAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

export function rotatePoint(point: Point, angle: number, center?: Point): Point {
  const rad = toRadians(angle)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = center?.x ?? 0
  const cy = center?.y ?? 0

  const dx = point.x - cx
  const dy = point.y - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    w: bounds.w + padding * 2,
    h: bounds.h + padding * 2,
  }
}

export function isIntersects(a: Bounds | [Point, Point], b: Bounds | [Point, Point]): boolean {
  const aIsLine = Array.isArray(a)
  const bIsLine = Array.isArray(b)

  if (aIsLine) {
    return bIsLine ? lineIntersectsLine(a[0], a[1], b[0], b[1]) : lineIntersectsBounds(a[0], a[1], b as Bounds)
  }
  return bIsLine ? lineIntersectsBounds(b[0], b[1], a as Bounds) : boundsIntersectBounds(a as Bounds, b as Bounds)
}

function boundsIntersectBounds(rect1: Bounds, rect2: Bounds): boolean {
  return !(
    rect1.x + rect1.w < rect2.x ||
    rect2.x + rect2.w < rect1.x ||
    rect1.y + rect1.h < rect2.y ||
    rect2.y + rect2.h < rect1.y
  )
}

function lineIntersectsBounds(p1: Point, p2: Point, bounds: Bounds): boolean {
  if (isPointInBounds(p1, bounds) || isPointInBounds(p2, bounds)) {
    return true
  }

  const { x, y, w, h } = bounds
  const tl: Point = { x, y }
  const tr: Point = { x: x + w, y }
  const br: Point = { x: x + w, y: y + h }
  const bl: Point = { x, y: y + h }

  return (
    lineIntersectsLine(p1, p2, tl, tr) ||
    lineIntersectsLine(p1, p2, tr, br) ||
    lineIntersectsLine(p1, p2, br, bl) ||
    lineIntersectsLine(p1, p2, bl, tl)
  )
}

function lineIntersectsLine(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)

  if (d1 * d2 < 0 && d3 * d4 < 0) {
    return true
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true
  if (d2 === 0 && onSegment(p3, p4, p2)) return true
  if (d3 === 0 && onSegment(p1, p2, p3)) return true
  if (d4 === 0 && onSegment(p1, p2, p4)) return true

  return false
}

function direction(pi: Point, pj: Point, pk: Point): number {
  return (pk.x - pi.x) * (pj.y - pi.y) - (pj.x - pi.x) * (pk.y - pi.y)
}

function onSegment(pi: Point, pj: Point, pk: Point): boolean {
  return (
    Math.min(pi.x, pj.x) <= pk.x &&
    pk.x <= Math.max(pi.x, pj.x) &&
    Math.min(pi.y, pj.y) <= pk.y &&
    pk.y <= Math.max(pi.y, pj.y)
  )
}

export interface Point {
  x: number
  y: number
}

export interface Size {
  w: number
  h: number
}

export interface Rect extends Point, Size {}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Line {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Circle {
  cx: number
  cy: number
  r: number
}

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate squared distance (faster, for comparisons)
 */
export function getDistanceSquared(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return dx * dx + dy * dy
}

/**
 * Check if point is inside rectangle
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h
}

/**
 * Check if point is inside rotated rectangle
 */
export function isPointInRotatedRect(point: Point, rect: Rect, angle: number): boolean {
  if (angle === 0) {
    return isPointInRect(point, rect)
  }

  // Translate point to rect center
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const px = point.x - cx
  const py = point.y - cy

  // Rotate point in opposite direction
  const rad = (-angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rx = px * cos - py * sin
  const ry = px * sin + py * cos

  // Check in unrotated space
  return rx >= -rect.w / 2 && rx <= rect.w / 2 && ry >= -rect.h / 2 && ry <= rect.h / 2
}

/**
 * Get center point of rectangle
 */
export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  }
}

/**
 * Normalize rectangle (ensure width and height are positive)
 */
export function normalizeRect(rect: Rect): Rect {
  let x = rect.x
  let y = rect.y
  let w = rect.w
  let h = rect.h

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

/**
 * Get bounding box of two rectangles
 */
export function unionRect(rect1: Rect, rect2: Rect): Rect {
  const x = Math.min(rect1.x, rect2.x)
  const y = Math.min(rect1.y, rect2.y)
  const right1 = rect1.x + rect1.w
  const right2 = rect2.x + rect2.w
  const bottom1 = rect1.y + rect1.h
  const bottom2 = rect2.y + rect2.h

  return {
    x,
    y,
    w: Math.max(right1, right2) - x,
    h: Math.max(bottom1, bottom2) - y,
  }
}

/**
 * Check if two rectangles intersect
 */
export function isRectIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.w < rect2.x ||
    rect2.x + rect2.w < rect1.x ||
    rect1.y + rect1.h < rect2.y ||
    rect2.y + rect2.h < rect1.y
  )
}

/**
 * Get intersection area of two rectangles
 */
export function getRectIntersection(rect1: Rect, rect2: Rect): Rect | null {
  const x = Math.max(rect1.x, rect2.x)
  const y = Math.max(rect1.y, rect2.y)
  const right1 = rect1.x + rect1.w
  const right2 = rect2.x + rect2.w
  const bottom1 = rect1.y + rect1.h
  const bottom2 = rect2.y + rect2.h

  const right = Math.min(right1, right2)
  const bottom = Math.min(bottom1, bottom2)

  if (right > x && bottom > y) {
    return { x, y, w: right - x, h: bottom - y }
  }

  return null
}

/**
 * Check if point is near line (within threshold)
 */
export function isPointNearLine(point: Point, line: Line, threshold: number = 5): boolean {
  const { x1, y1, x2, y2 } = line

  // Line vector
  const dx = x2 - x1
  const dy = y2 - y1

  // Point vector from line start
  const px = point.x - x1
  const py = point.y - y1

  const lineLengthSquared = dx * dx + dy * dy

  if (lineLengthSquared === 0) {
    // Line is a point
    return getDistance(point, { x: x1, y: y1 }) <= threshold
  }

  // Project point onto line
  let t = (px * dx + py * dy) / lineLengthSquared
  t = Math.max(0, Math.min(1, t))

  // Closest point on line
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy

  return getDistance(point, { x: closestX, y: closestY }) <= threshold
}

/**
 * Check if two lines intersect
 */
export function isLineIntersect(line1: Line, line2: Line): boolean {
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2

  const denom = (y4 - y3) * (line1.x2 - line1.x1) - (x4 - x3) * (line1.y2 - line1.y1)

  if (denom === 0) {
    return false // Lines are parallel
  }

  const ua = ((x4 - x3) * (line1.y1 - y3) - (y4 - y3) * (line1.x1 - x3)) / denom
  const ub = ((line1.x2 - line1.x1) * (line1.y1 - y3) - (line1.y2 - line1.y1) * (line1.x1 - x3)) / denom

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

/**
 * Get intersection point of two lines
 */
export function getLineIntersection(line1: Line, line2: Line): Point | null {
  const { x1: x3, y1: y3, x2: x4, y2: y4 } = line2

  const denom = (y4 - y3) * (line1.x2 - line1.x1) - (x4 - x3) * (line1.y2 - line1.y1)

  if (denom === 0) {
    return null // Lines are parallel
  }

  const ua = ((x4 - x3) * (line1.y1 - y3) - (y4 - y3) * (line1.x1 - x3)) / denom

  return {
    x: line1.x1 + ua * (line1.x2 - line1.x1),
    y: line1.y1 + ua * (line1.y2 - line1.y1),
  }
}

/**
 * Check if point is inside polygon
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y
    const xj = polygon[j].x,
      yj = polygon[j].y

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Calculate angle between two points (in degrees)
 */
export function getAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI)
}

/**
 * Rotate point around center
 */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const dx = point.x - center.x
  const dy = point.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

/**
 * Scale point from center
 */
export function scalePoint(point: Point, center: Point, scale: number): Point {
  return {
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }
}

/**
 * Convert bounds to rect
 */
export function boundsToRect(bounds: Bounds): Rect {
  return {
    x: bounds.x,
    y: bounds.y,
    w: bounds.width,
    h: bounds.height,
  }
}

/**
 * Convert rect to bounds
 */
export function rectToBounds(rect: Rect): Bounds {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
  }
}

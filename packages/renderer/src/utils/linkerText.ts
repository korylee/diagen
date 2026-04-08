import type { FontStyle, LinkerRoute } from '@diagen/core'
import type { Point } from '@diagen/shared'

const PadX = 6
const PadY = 4

export interface LinkerTextBox {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  lines: string[]
  lineHeight: number
}

export function getLinkerTextBox(
  route: LinkerRoute,
  text: string,
  fontStyle: FontStyle | undefined,
  options: {
    curved?: boolean
    measureText?: (line: string) => number
  } = {},
): LinkerTextBox | null {
  if (!text) return null

  const center = getRouteCenter(route, options.curved === true)
  if (!center) return null

  const lines = text.split('\n')
  const fontSize = fontStyle?.size || 13
  const lineHeight = fontSize * (fontStyle?.lineHeight || 1.25)
  const contentWidth = Math.max(
    ...lines.map(line => options.measureText?.(line) ?? estimateLineWidth(line, fontSize)),
    fontSize,
  )
  const w = contentWidth + PadX * 2
  const h = Math.max(lines.length * lineHeight + PadY * 2, fontSize + PadY * 2)

  return {
    x: center.x - w / 2,
    y: center.y - h / 2,
    w,
    h,
    cx: center.x,
    cy: center.y,
    lines,
    lineHeight,
  }
}

function estimateLineWidth(line: string, fontSize: number): number {
  return Math.max(line.length, 1) * fontSize * 0.6
}

function getRouteCenter(route: LinkerRoute, curved: boolean): Point | null {
  if (curved && route.points.length === 4) {
    return getCurveMidpoint(route.points)
  }

  return getPolylineMidpoint(route.points)
}

function getPolylineMidpoint(points: Point[]): Point | null {
  if (points.length === 0) return null
  if (points.length === 1) return points[0]

  let total = 0
  const lengths: number[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const length = getSegmentLength(points[i], points[i + 1])
    lengths.push(length)
    total += length
  }

  if (total === 0) return points[0]

  let passed = 0
  const target = total / 2

  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]
    if (passed + length < target) {
      passed += length
      continue
    }

    const ratio = length === 0 ? 0 : (target - passed) / length
    return lerpPoint(points[i], points[i + 1], ratio)
  }

  return points[points.length - 1]
}

function getCurveMidpoint(points: Point[]): Point {
  const [p0, p1, p2, p3] = points
  const t = 0.5
  const mt = 1 - t

  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

function getSegmentLength(from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return Math.sqrt(dx * dx + dy * dy)
}

function lerpPoint(from: Point, to: Point, ratio: number): Point {
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  }
}

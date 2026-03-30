import type { LinkerElement, LinkerRoute } from '@diagen/core'
import { getDistance, type Point } from '@diagen/shared'

export type LinkerHitType = 'from' | 'to' | 'control' | 'segment' | 'line'

export interface LinkerHit {
  type: LinkerHitType
  controlIndex?: number
  segmentIndex?: number
  point?: Point
}

export interface LinkerHitTestOptions {
  zoom: number
  endpointTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  lineTolerance?: number
}

const DEFAULT_ENDPOINT_TOLERANCE = 10
const DEFAULT_CONTROL_TOLERANCE = 8
const DEFAULT_SEGMENT_TOLERANCE = 8
const DEFAULT_LINE_TOLERANCE = 8

/**
 * 连线命中判定：端点 > 控制点 > 线段中点 > 线身
 */
export function hitTestLinker(
  linker: LinkerElement,
  route: LinkerRoute,
  point: Point,
  options: LinkerHitTestOptions,
): LinkerHit | null {
  const zoom = Math.max(options.zoom, 0.01)
  const endpointTol = (options.endpointTolerance ?? DEFAULT_ENDPOINT_TOLERANCE) / zoom
  const controlTol = (options.controlTolerance ?? DEFAULT_CONTROL_TOLERANCE) / zoom
  const segmentTol = (options.segmentTolerance ?? DEFAULT_SEGMENT_TOLERANCE) / zoom
  const lineTol = (options.lineTolerance ?? DEFAULT_LINE_TOLERANCE) / zoom

  if (route.points.length < 2) return null

  const startPoint = route.points[0]
  if (getDistance(point, startPoint) <= endpointTol) {
    return { type: 'from' }
  }

  const lastIndex = route.points.length - 1
  const endPoint = route.points[lastIndex]
  if (getDistance(point, endPoint) <= endpointTol) {
    return { type: 'to' }
  }

  for (let i = 0; i < linker.points.length; i++) {
    if (getDistance(point, linker.points[i]) <= controlTol) {
      return { type: 'control', controlIndex: i }
    }
  }

  for (let i = 0; i < route.points.length - 1; i++) {
    const midpoint = {
      x: (route.points[i].x + route.points[i + 1].x) / 2,
      y: (route.points[i].y + route.points[i + 1].y) / 2,
    }
    if (getDistance(point, midpoint) <= segmentTol) {
      return { type: 'segment', segmentIndex: i, point: midpoint }
    }
  }

  for (let i = 0; i < route.points.length - 1; i++) {
    if (distancePointToSegment(point, route.points[i], route.points[i + 1]) <= lineTol) {
      return { type: 'line', segmentIndex: i }
    }
  }

  return null
}

function distancePointToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return getDistance(point, start)

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const clampedT = Math.max(0, Math.min(1, t))

  return getDistance(point, {
    x: start.x + clampedT * dx,
    y: start.y + clampedT * dy,
  })
}

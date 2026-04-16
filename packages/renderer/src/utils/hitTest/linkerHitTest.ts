import type { LinkerElement, LinkerRoute } from '@diagen/core'
import type { Point } from '@diagen/shared'

export type LinkerGeometryHitType = 'from' | 'to' | 'control' | 'segment' | 'line'
export type LinkerHitType = LinkerGeometryHitType | 'text'

export interface LinkerGeometryHit {
  type: LinkerGeometryHitType
  controlIndex?: number
  segmentIndex?: number
  point?: Point
}

export type LinkerHit = LinkerGeometryHit | { type: 'text' }

export interface LinkerHitTestOptions {
  zoom: number
  endpointTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  lineTolerance?: number
}

const MIN_ZOOM = 0.01
const DEFAULT_ENDPOINT_TOLERANCE = 10
const DEFAULT_CONTROL_TOLERANCE = 8
const DEFAULT_SEGMENT_TOLERANCE = 8
const DEFAULT_LINE_TOLERANCE = 8

/**
 * 连线几何命中判定：端点 > 控制点 > 线段中点 > 线身。
 * 仅处理 route 与控制点的几何命中，不承担 text 命中语义。
 */
export function hitTestLinkerGeometry(
  linker: Pick<LinkerElement, 'points'>,
  route: LinkerRoute,
  point: Point,
  options: LinkerHitTestOptions,
): LinkerGeometryHit | null {
  const routePoints = route.points
  if (routePoints.length < 2) return null
  const routeSegmentCount = routePoints.length - 1

  const tolerance = resolveLinkerTolerances(options)

  if (isWithinDistance(point, routePoints[0], tolerance.endpointSquared)) {
    return { type: 'from' }
  }

  const endPoint = routePoints[routePoints.length - 1]
  if (isWithinDistance(point, endPoint, tolerance.endpointSquared)) {
    return { type: 'to' }
  }

  for (let i = 0; i < linker.points.length; i++) {
    if (isWithinDistance(point, linker.points[i], tolerance.controlSquared)) {
      return { type: 'control', controlIndex: i }
    }
  }

  let lineHitSegmentIndex: number | null = null

  for (let i = 0; i < routeSegmentCount; i++) {
    const start = routePoints[i]
    const end = routePoints[i + 1]
    const midpoint = {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    }

    if (isWithinDistance(point, midpoint, tolerance.segmentSquared)) {
      return { type: 'segment', segmentIndex: i, point: midpoint }
    }

    if (lineHitSegmentIndex === null && distancePointToSegmentSquared(point, start, end) <= tolerance.lineSquared) {
      lineHitSegmentIndex = i
    }
  }

  return lineHitSegmentIndex === null ? null : { type: 'line', segmentIndex: lineHitSegmentIndex }
}

interface LinkerHitTolerance {
  endpoint: number
  control: number
  segment: number
  line: number
  endpointSquared: number
  controlSquared: number
  segmentSquared: number
  lineSquared: number
}

function resolveLinkerTolerances(options: LinkerHitTestOptions): LinkerHitTolerance {
  const zoom = Math.max(options.zoom, MIN_ZOOM)
  const endpoint = (options.endpointTolerance ?? DEFAULT_ENDPOINT_TOLERANCE) / zoom
  const control = (options.controlTolerance ?? DEFAULT_CONTROL_TOLERANCE) / zoom
  const segment = (options.segmentTolerance ?? DEFAULT_SEGMENT_TOLERANCE) / zoom
  const line = (options.lineTolerance ?? DEFAULT_LINE_TOLERANCE) / zoom

  return {
    endpoint,
    control,
    segment,
    line,
    endpointSquared: endpoint * endpoint,
    controlSquared: control * control,
    segmentSquared: segment * segment,
    lineSquared: line * line,
  }
}

export function getLinkerMaxTolerance(options: LinkerHitTestOptions): number {
  const tolerance = resolveLinkerTolerances(options)
  return Math.max(tolerance.endpoint, tolerance.control, tolerance.segment, tolerance.line)
}

function isWithinDistance(point: Point, target: Point, squaredTolerance: number): boolean {
  return getDistanceSquared(point, target) <= squaredTolerance
}

function getDistanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

function distancePointToSegmentSquared(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return getDistanceSquared(point, start)

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const clampedT = Math.max(0, Math.min(1, t))
  const projection = {
    x: start.x + clampedT * dx,
    y: start.y + clampedT * dy,
  }

  return getDistanceSquared(point, projection)
}

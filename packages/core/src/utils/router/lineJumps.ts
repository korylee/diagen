import { Point } from '@diagen/shared'
import type { LinkerRoute, LinkerRouteJump } from './linkerRoute'

const DEFAULT_LINE_JUMP_RADIUS = 10
const DEFAULT_ENDPOINT_PADDING = 14
const DEFAULT_JUMP_GAP = 4
const MIN_VISIBLE_JUMP_RADIUS = 2
const EPSILON = 0.001

export interface CalculateLineJumpsOptions {
  radius?: number
  endpointPadding?: number
  jumpGap?: number
}

type SegmentOrientation = 'horizontal' | 'vertical'

interface OrthogonalSegment {
  index: number
  from: Point
  to: Point
  orientation: SegmentOrientation
  min: number
  max: number
  fixed: number
}

export function calculateLineJumps(
  route: LinkerRoute,
  otherRoutes: LinkerRoute[],
  options: CalculateLineJumpsOptions = {},
): LinkerRouteJump[] {
  const radius = Math.max(MIN_VISIBLE_JUMP_RADIUS, options.radius ?? DEFAULT_LINE_JUMP_RADIUS)
  const endpointPadding = Math.max(radius, options.endpointPadding ?? DEFAULT_ENDPOINT_PADDING)
  const jumpGap = Math.max(0, options.jumpGap ?? DEFAULT_JUMP_GAP)
  const routeSegments = collectOrthogonalSegments(route)
  const otherSegments = otherRoutes.flatMap(otherRoute => collectOrthogonalSegments(otherRoute))

  return routeSegments.flatMap(segment => {
    const jumps: LinkerRouteJump[] = []
    const seen = new Set<string>()

    for (const otherSegment of otherSegments) {
      if (otherSegment.orientation === segment.orientation) continue

      const center = getOrthogonalIntersection(segment, otherSegment)
      if (!center) continue
      if (!isJumpSafeDistance(center, segment, endpointPadding)) continue
      if (!isJumpSafeDistance(center, otherSegment, endpointPadding)) continue

      const key = `${center.x}:${center.y}`
      if (seen.has(key)) continue
      seen.add(key)

      jumps.push({
        segmentIndex: segment.index,
        center,
        orientation: segment.orientation,
        radius,
      })
    }

    if (jumps.length <= 1) return jumps

    jumps.sort((a, b) => {
      return segment.orientation === 'horizontal' ? a.center.x - b.center.x : a.center.y - b.center.y
    })

    return normalizeSegmentJumps(segment, jumps, jumpGap)
  })
}

function getSegmentOrientation(from: Point, to: Point): SegmentOrientation | null {
  if (Math.abs(from.y - to.y) <= EPSILON && Math.abs(from.x - to.x) > EPSILON) return 'horizontal'
  if (Math.abs(from.x - to.x) <= EPSILON && Math.abs(from.y - to.y) > EPSILON) return 'vertical'
  return null
}

function collectOrthogonalSegments(route: LinkerRoute): OrthogonalSegment[] {
  const segments: OrthogonalSegment[] = []

  for (let index = 0; index < route.points.length - 1; index++) {
    const from = route.points[index]
    const to = route.points[index + 1]
    const orientation = getSegmentOrientation(from, to)
    if (!orientation) continue

    const start = orientation === 'horizontal' ? from.x : from.y
    const end = orientation === 'horizontal' ? to.x : to.y

    segments.push({
      index,
      from,
      to,
      orientation,
      min: Math.min(start, end),
      max: Math.max(start, end),
      fixed: orientation === 'horizontal' ? from.y : from.x,
    })
  }

  return segments
}

function getOrthogonalIntersection(segment: OrthogonalSegment, otherSegment: OrthogonalSegment) {
  if (segment.orientation === otherSegment.orientation) return null

  const horizontal = segment.orientation === 'horizontal' ? segment : otherSegment
  const vertical = segment.orientation === 'vertical' ? segment : otherSegment
  const center = {
    x: vertical.fixed,
    y: horizontal.fixed,
  }

  if (!isCoordinateInside(center.x, horizontal.min, horizontal.max)) return null
  if (!isCoordinateInside(center.y, vertical.min, vertical.max)) return null
  return center
}

function isCoordinateInside(value: number, min: number, max: number): boolean {
  return value > min + EPSILON && value < max - EPSILON
}

function isSegmentIntersectionEligible(value: number, min: number, max: number, padding: number): boolean {
  return value >= min + padding && value <= max - padding
}

function isJumpSafeDistance(center: LinkerRouteJump['center'], segment: OrthogonalSegment, padding: number): boolean {
  const position = segment.orientation === 'horizontal' ? center.x : center.y
  return isSegmentIntersectionEligible(position, segment.min, segment.max, padding)
}

function normalizeSegmentJumps(
  segment: OrthogonalSegment,
  jumps: LinkerRouteJump[],
  jumpGap: number,
): LinkerRouteJump[] {
  if (jumps.length === 0) return []

  const positions = jumps.map(jump => (segment.orientation === 'horizontal' ? jump.center.x : jump.center.y))

  return jumps.flatMap((jump, index) => {
    const pos = positions[index]
    const prev = positions[index - 1]
    const next = positions[index + 1]
    let maxRadius = jump.radius

    maxRadius = Math.min(maxRadius, Math.max(0, pos - segment.min - jumpGap))
    maxRadius = Math.min(maxRadius, Math.max(0, segment.max - pos - jumpGap))

    if (prev !== undefined) {
      maxRadius = Math.min(maxRadius, Math.max(0, (pos - prev - jumpGap) / 2))
    }
    if (next !== undefined) {
      maxRadius = Math.min(maxRadius, Math.max(0, (next - pos - jumpGap) / 2))
    }

    if (maxRadius < MIN_VISIBLE_JUMP_RADIUS) {
      return []
    }

    return [
      {
        ...jump,
        radius: maxRadius,
      },
    ]
  })
}

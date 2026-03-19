import type { LinkerRoute, LinkerRouteJump } from './linkerRoute'

const DEFAULT_LINE_JUMP_RADIUS = 10
const DEFAULT_ENDPOINT_PADDING = 14
const EPSILON = 0.001

export interface CalculateLineJumpsOptions {
  radius?: number
  endpointPadding?: number
}

type SegmentOrientation = 'horizontal' | 'vertical'

export function calculateLineJumps(
  route: LinkerRoute,
  otherRoutes: LinkerRoute[],
  options: CalculateLineJumpsOptions = {},
): LinkerRouteJump[] {
  const radius = Math.max(2, options.radius ?? DEFAULT_LINE_JUMP_RADIUS)
  const endpointPadding = Math.max(radius, options.endpointPadding ?? DEFAULT_ENDPOINT_PADDING)
  const jumps: LinkerRouteJump[] = []
  const seen = new Set<string>()

  for (let i = 0; i < route.points.length - 1; i++) {
    const from = route.points[i]
    const to = route.points[i + 1]
    const orientation = getSegmentOrientation(from, to)
    if (!orientation) continue

    for (const otherRoute of otherRoutes) {
      for (let j = 0; j < otherRoute.points.length - 1; j++) {
        const otherFrom = otherRoute.points[j]
        const otherTo = otherRoute.points[j + 1]
        const otherOrientation = getSegmentOrientation(otherFrom, otherTo)
        if (!otherOrientation || otherOrientation === orientation) continue

        const center = getOrthogonalIntersection(from, to, otherFrom, otherTo)
        if (!center) continue
        if (!isJumpSafeDistance(center, from, to, orientation, endpointPadding)) continue
        if (!isJumpSafeDistance(center, otherFrom, otherTo, otherOrientation, endpointPadding)) continue

        const key = `${i}:${center.x.toFixed(3)}:${center.y.toFixed(3)}`
        if (seen.has(key)) continue
        seen.add(key)

        jumps.push({
          segmentIndex: i,
          center,
          orientation,
          radius,
        })
      }
    }
  }

  return jumps.sort((a, b) => {
    if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex
    return a.orientation === 'horizontal' ? a.center.x - b.center.x : a.center.y - b.center.y
  })
}

function getSegmentOrientation(
  from: LinkerRoute['points'][number],
  to: LinkerRoute['points'][number],
): SegmentOrientation | null {
  if (Math.abs(from.y - to.y) <= EPSILON && Math.abs(from.x - to.x) > EPSILON) return 'horizontal'
  if (Math.abs(from.x - to.x) <= EPSILON && Math.abs(from.y - to.y) > EPSILON) return 'vertical'
  return null
}

function getOrthogonalIntersection(
  from: LinkerRoute['points'][number],
  to: LinkerRoute['points'][number],
  otherFrom: LinkerRoute['points'][number],
  otherTo: LinkerRoute['points'][number],
) {
  const orientation = getSegmentOrientation(from, to)
  const otherOrientation = getSegmentOrientation(otherFrom, otherTo)
  if (!orientation || !otherOrientation || orientation === otherOrientation) return null

  const horizontal = orientation === 'horizontal' ? { from, to } : { from: otherFrom, to: otherTo }
  const vertical = orientation === 'vertical' ? { from, to } : { from: otherFrom, to: otherTo }
  const center = {
    x: vertical.from.x,
    y: horizontal.from.y,
  }

  if (!isCoordinateInside(center.x, horizontal.from.x, horizontal.to.x)) return null
  if (!isCoordinateInside(center.y, vertical.from.y, vertical.to.y)) return null
  return center
}

function isCoordinateInside(value: number, start: number, end: number): boolean {
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  return value > min + EPSILON && value < max - EPSILON
}

function isSegmentIntersectionEligible(value: number, start: number, end: number, padding: number): boolean {
  const min = Math.min(start, end)
  const max = Math.max(start, end)
  return value >= min + padding && value <= max - padding
}

function isJumpSafeDistance(
  center: LinkerRouteJump['center'],
  from: LinkerRoute['points'][number],
  to: LinkerRoute['points'][number],
  orientation: SegmentOrientation,
  padding: number,
): boolean {
  return orientation === 'horizontal'
    ? isSegmentIntersectionEligible(center.x, from.x, to.x, padding)
    : isSegmentIntersectionEligible(center.y, from.y, to.y, padding)
}

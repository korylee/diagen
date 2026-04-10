import { getDistance, type Point } from '@diagen/shared'
import type { LinkerRoute } from './linkerRoute'

export function getRouteCenter(route: LinkerRoute, curved: boolean): Point | null {
  if (curved && route.points.length === 4) {
    const [p0, p1, p2, p3] = route.points
    return getCubicPoint(p0, p1, p2, p3, 0.5)
  }

  return getPolylineCenter(route.points)
}

function getPolylineCenter(points: Point[]): Point | null {
  if (points.length === 0) return null
  if (points.length === 1) return points[0]

  let total = 0
  const lengths: number[] = []

  for (let i = 0; i < points.length - 1; i++) {
    const length = getDistance(points[i], points[i + 1])
    lengths.push(length)
    total += length
  }

  if (total === 0) return points[0]

  const target = total / 2
  let passed = 0

  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]
    if (passed + length < target) {
      passed += length
      continue
    }

    const ratio = length === 0 ? 0 : (target - passed) / length
    return {
      x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
      y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
    }
  }

  return points[points.length - 1]
}

function getCubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t

  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

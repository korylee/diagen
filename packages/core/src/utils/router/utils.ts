import type { Point, Rect } from '@diagen/shared'
import { expandRect, lineIntersectsRect, manhattanDistance, snapToGrid } from '@diagen/shared'

export { expandRect, lineIntersectsRect, manhattanDistance, snapToGrid }

export function euclideanDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function getBendCount(points: Point[]): number {
  if (points.length <= 2) return 0
  let bends = 0
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]
    const dir1 = curr.x === prev.x ? 'v' : 'h'
    const dir2 = next.x === curr.x ? 'v' : 'h'
    if (dir1 !== dir2) bends++
  }
  return bends
}

export function calculatePathLength(points: Point[]): number {
  let length = 0
  for (let i = 0; i < points.length - 1; i++) {
    length += euclideanDistance(points[i], points[i + 1])
  }
  return length
}

export function simplifyOrthogonalPath(path: Point[]): Point[] {
  if (path.length <= 2) return path

  const result: Point[] = [path[0]]

  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = path[i]
    const next = path[i + 1]

    const dir1 = curr.x === prev.x ? 'v' : 'h'
    const dir2 = next.x === curr.x ? 'v' : 'h'

    if (dir1 !== dir2) {
      result.push(curr)
    }
  }

  result.push(path[path.length - 1])
  return result
}

export function calculateRouteCost(route: Point[], bendCost: number = 10): number {
  return calculatePathLength(route) + getBendCount(route) * bendCost
}

export function calculateBounds(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  padding: number,
  expand: number = 100
): Rect {
  let minX = Math.min(from.x, to.x)
  let minY = Math.min(from.y, to.y)
  let maxX = Math.max(from.x, to.x)
  let maxY = Math.max(from.y, to.y)

  for (const obs of obstacles) {
    const b = obs.bounds
    minX = Math.min(minX, b.x - padding)
    minY = Math.min(minY, b.y - padding)
    maxX = Math.max(maxX, b.x + b.w + padding)
    maxY = Math.max(maxY, b.y + b.h + padding)
  }

  return {
    x: minX - expand,
    y: minY - expand,
    w: maxX - minX + expand * 2,
    h: maxY - minY + expand * 2,
  }
}

export function isPointInAnyObstacle(point: Point, obstacles: Obstacle[]): boolean {
  for (const obstacle of obstacles) {
    const expanded = expandRect(obstacle.bounds, obstacle.padding)
    if (point.x >= expanded.x && point.x <= expanded.x + expanded.w &&
        point.y >= expanded.y && point.y <= expanded.y + expanded.h) {
      return true
    }
  }
  return false
}

export function isRouteValid(route: Point[], obstacles: Obstacle[]): boolean {
  for (let i = 0; i < route.length - 1; i++) {
    for (const obstacle of obstacles) {
      const expanded = expandRect(obstacle.bounds, obstacle.padding)
      if (lineIntersectsRect(route[i], route[i + 1], expanded)) {
        return false
      }
    }
  }
  return true
}

interface Obstacle {
  bounds: Rect
  padding: number
}

import type { LinkerElement, LinkerType } from '@diagen/core'
import { isSameNumber, isSamePoint, type Point } from '@diagen/shared'

type Axis = 'x' | 'y'

export function supportsManualControlPoints(linkerType: LinkerType): boolean {
  return linkerType === 'broken' || linkerType === 'orthogonal'
}

export function areSamePoints(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((point, index) => isSamePoint(point, b[index]))
}

export function removeControlPointAt(points: Point[], index: number): Point[] | null {
  if (index < 0 || index >= points.length) return null
  return points.filter((_, pointIndex) => pointIndex !== index)
}

function dedupeSequentialPoints(points: Point[]): Point[] {
  if (points.length <= 1) return points

  const result: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const current = points[i]
    if (isSamePoint(result[result.length - 1], current)) continue
    result.push(current)
  }
  return result
}

function isCollinear(prev: Point, current: Point, next: Point): boolean {
  const ax = current.x - prev.x
  const ay = current.y - prev.y
  const bx = next.x - current.x
  const by = next.y - current.y
  return isSameNumber(ax * by - ay * bx, 0)
}

function resolveOrthogonalAxis(from: Point, to: Point): Axis | null {
  if (isSameNumber(from.x, to.x)) return 'x'
  if (isSameNumber(from.y, to.y)) return 'y'
  return null
}

function isAlignedOnAxis(a: Point, b: Point, axis: Axis): boolean {
  return axis === 'x' ? isSameNumber(a.x, b.x) : isSameNumber(a.y, b.y)
}

function simplifyCollinearPoints(path: Point[]): Point[] {
  if (path.length <= 2) return path

  const result: Point[] = [path[0]]
  for (let i = 1; i < path.length - 1; i++) {
    const prev = result[result.length - 1]
    const current = path[i]
    const next = path[i + 1]

    if (!isCollinear(prev, current, next)) {
      result.push(current)
    }
  }

  result.push(path[path.length - 1])
  return result
}

function normalizeBrokenPoints(points: Point[], from: Point, to: Point): Point[] {
  return simplifyCollinearPoints([from, ...points, to]).slice(1, -1)
}

function collapseOrthogonalBoxDetours(path: Point[]): Point[] {
  if (path.length <= 5) return path

  const result = [...path]
  let changed = true

  while (changed) {
    changed = false

    for (let i = 0; i <= result.length - 6; i++) {
      const a = result[i]
      const b = result[i + 1]
      const c = result[i + 2]
      const d = result[i + 3]
      const e = result[i + 4]
      const f = result[i + 5]

      const axis1 = resolveOrthogonalAxis(a, b)
      const axis2 = resolveOrthogonalAxis(b, c)
      const axis3 = resolveOrthogonalAxis(c, d)
      const axis4 = resolveOrthogonalAxis(d, e)
      const axis5 = resolveOrthogonalAxis(e, f)

      if (!axis1 || !axis2 || !axis3 || !axis4 || !axis5) continue
      if (axis1 !== axis3 || axis1 !== axis5) continue
      if (axis2 !== axis4) continue
      if (axis1 === axis2) continue
      if (!isAlignedOnAxis(a, f, axis1)) continue

      result.splice(i + 1, 4)
      changed = true
      break
    }
  }

  return result
}

function normalizeOrthogonalPoints(points: Point[], from: Point, to: Point): Point[] {
  let path = [from, ...points, to]
  let changed = true

  while (changed) {
    changed = false

    const simplified = simplifyCollinearPoints(path)
    if (!areSamePoints(simplified, path)) {
      path = simplified
      changed = true
    }

    const collapsed = collapseOrthogonalBoxDetours(path)
    if (!areSamePoints(collapsed, path)) {
      path = collapsed
      changed = true
    }
  }

  return path.slice(1, -1)
}

export function normalizeManualPoints(linkerType: LinkerType, points: Point[], from: Point, to: Point): Point[] {
  const deduped = dedupeSequentialPoints(points)
  if (deduped.length === 0) return deduped

  switch (linkerType) {
    case 'broken':
      return normalizeBrokenPoints(deduped, from, to)
    case 'orthogonal':
      return normalizeOrthogonalPoints(deduped, from, to)
    default:
      return deduped
  }
}

export function normalizeLinkerManualPoints(
  linker: Pick<LinkerElement, 'linkerType' | 'from' | 'to'>,
  points: Point[],
): Point[] {
  return normalizeManualPoints(
    linker.linkerType,
    points,
    { x: linker.from.x, y: linker.from.y },
    { x: linker.to.x, y: linker.to.y },
  )
}

import { deepClone, Point } from '@diagen/shared'
import { unwrap } from 'solid-js/store'

export const unwrapClone = <T>(value: T): T => {
  const raw = unwrap(value)
  if (typeof structuredClone === 'function') {
    return structuredClone(raw)
  }
  return deepClone(raw)
}

export function getCubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t

  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

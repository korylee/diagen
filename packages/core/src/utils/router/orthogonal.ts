import type { Point, Rect } from '@diagen/shared'
import type { Obstacle, RouteResult, RouterConfig } from './types'
import {
  calculateBounds,
  calculateRouteCost,
  isPointInAnyObstacle,
  isRouteValid,
  simplifyOrthogonalPath,
} from './utils'

export interface OrthogonalRouteOptions {
  startDirection?: 'h' | 'v'
  endDirection?: 'h' | 'v'
  bendCost?: number
}

export function orthogonalRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: RouterConfig,
  options: OrthogonalRouteOptions = {}
): RouteResult {
  const directRoute = tryDirectRoute(from, to, obstacles)
  if (directRoute.success) return directRoute

  const simpleRoute = trySimpleOrthogonal(from, to, obstacles, options)
  if (simpleRoute.success) return simpleRoute

  const intermediateRoute = tryIntermediateRoute(from, to, obstacles, options)
  if (intermediateRoute.success) return intermediateRoute

  const complexRoute = tryComplexOrthogonal(from, to, obstacles, config, options)
  if (complexRoute.success) return complexRoute

  return { points: [from, to], success: false }
}

function tryDirectRoute(from: Point, to: Point, obstacles: Obstacle[]): RouteResult {
  if (isRouteValid([from, to], obstacles)) {
    return { points: [from, to], success: true }
  }
  return { points: [], success: false }
}

function trySimpleOrthogonal(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  options: OrthogonalRouteOptions
): RouteResult {
  const dx = to.x - from.x
  const dy = to.y - from.y

  const candidates: Point[][] = []

  if (options.startDirection !== 'v') {
    candidates.push([from, { x: from.x + dx, y: from.y }, { x: from.x + dx, y: to.y }, to])
    candidates.push([from, { x: to.x, y: from.y }, to])
  }

  if (options.startDirection !== 'h') {
    candidates.push([from, { x: from.x, y: from.y + dy }, { x: to.x, y: from.y + dy }, to])
    candidates.push([from, { x: from.x, y: to.y }, to])
  }

  return findBestRoute(candidates, obstacles, options.bendCost)
}

function tryIntermediateRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  options: OrthogonalRouteOptions
): RouteResult {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2

  const intermediatePoints: Point[] = [
    { x: midX, y: midY },
    { x: from.x, y: midY },
    { x: to.x, y: midY },
    { x: midX, y: from.y },
    { x: midX, y: to.y },
  ]

  const candidates: Point[][] = []

  for (const mid of intermediatePoints) {
    candidates.push([from, { x: mid.x, y: from.y }, { x: mid.x, y: to.y }, to])
    candidates.push([from, { x: from.x, y: mid.y }, { x: to.x, y: mid.y }, to])
  }

  return findBestRoute(candidates, obstacles, options.bendCost)
}

function tryComplexOrthogonal(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: RouterConfig,
  options: OrthogonalRouteOptions
): RouteResult {
  const bounds = calculateBounds(from, to, obstacles, config.padding, 50)

  const candidates: Point[][] = []

  const startEscapePoints = generateEscapePoints(from, bounds, obstacles)
  const endEscapePoints = generateEscapePoints(to, bounds, obstacles)

  for (const startEscape of startEscapePoints) {
    for (const endEscape of endEscapePoints) {
      const route = buildEscapeRoute(from, to, startEscape, endEscape)
      candidates.push(route)
    }
  }

  const escapeOffsets = [50, 100, 150, 200]
  for (const offset of escapeOffsets) {
    candidates.push([from, { x: from.x + offset, y: from.y }, { x: from.x + offset, y: to.y }, to])
    candidates.push([from, { x: from.x - offset, y: from.y }, { x: from.x - offset, y: to.y }, to])
    candidates.push([from, { x: from.x, y: from.y + offset }, { x: to.x, y: from.y + offset }, to])
    candidates.push([from, { x: from.x, y: from.y - offset }, { x: to.x, y: from.y - offset }, to])
  }

  const topY = bounds.y - 30
  const bottomY = bounds.y + bounds.h + 30
  const leftX = bounds.x - 30
  const rightX = bounds.x + bounds.w + 30

  for (const offset of escapeOffsets) {
    candidates.push([
      from,
      { x: from.x + offset, y: from.y },
      { x: from.x + offset, y: topY },
      { x: to.x, y: topY },
      { x: to.x, y: to.y },
      to,
    ])
    candidates.push([
      from,
      { x: from.x + offset, y: from.y },
      { x: from.x + offset, y: bottomY },
      { x: to.x, y: bottomY },
      { x: to.x, y: to.y },
      to,
    ])
    candidates.push([
      from,
      { x: from.x, y: from.y + offset },
      { x: leftX, y: from.y + offset },
      { x: leftX, y: to.y },
      { x: to.x, y: to.y },
      to,
    ])
    candidates.push([
      from,
      { x: from.x, y: from.y + offset },
      { x: rightX, y: from.y + offset },
      { x: rightX, y: to.y },
      { x: to.x, y: to.y },
      to,
    ])
  }

  return findBestRoute(candidates, obstacles, options.bendCost)
}

function generateEscapePoints(point: Point, bounds: Rect, obstacles: Obstacle[]): Point[] {
  const offsets = [30, 60, 100, 150]
  const points: Point[] = []

  for (const offset of offsets) {
    points.push(
      { x: point.x, y: bounds.y - offset },
      { x: point.x, y: bounds.y + bounds.h + offset },
      { x: bounds.x - offset, y: point.y },
      { x: bounds.x + bounds.w + offset, y: point.y }
    )
  }

  return points.filter((p) => !isPointInAnyObstacle(p, obstacles))
}

function buildEscapeRoute(from: Point, to: Point, startEscape: Point, endEscape: Point): Point[] {
  const route: Point[] = [from, { x: startEscape.x, y: from.y }, startEscape]

  if (startEscape.x !== endEscape.x && startEscape.y !== endEscape.y) {
    const midY = (startEscape.y + endEscape.y) / 2
    route.push({ x: startEscape.x, y: midY }, { x: endEscape.x, y: midY })
  }

  route.push(endEscape, { x: endEscape.x, y: to.y }, to)
  return route
}

function findBestRoute(
  candidates: Point[][],
  obstacles: Obstacle[],
  bendCost: number = 10
): RouteResult {
  let bestRoute: RouteResult = { points: [], success: false }
  let minCost = Infinity

  for (const route of candidates) {
    if (isRouteValid(route, obstacles)) {
      const simplified = simplifyOrthogonalPath(route)
      const cost = calculateRouteCost(simplified, bendCost)
      if (cost < minCost) {
        minCost = cost
        bestRoute = { points: simplified, success: true, cost }
      }
    }
  }

  return bestRoute
}

export function findOrthogonalRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  options: OrthogonalRouteOptions = {}
): RouteResult {
  const defaultConfig: RouterConfig = {
    gridSize: 10,
    padding: 15,
    maxIterations: 5000,
    diagonalCost: 1.414,
    orthogonalCost: 1,
  }

  return orthogonalRoute(from, to, obstacles, defaultConfig, options)
}

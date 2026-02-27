import type { Point, Rect } from '@diagen/shared'
import { createMinHeap } from '@diagen/shared'
import type { Obstacle, RouteResult, RouterConfig } from './types'
import {
  calculateBounds,
  expandRect,
  simplifyOrthogonalPath,
  snapToGrid,
} from './utils'

interface AStarNode {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: AStarNode | null
  direction: 'h' | 'v' | null
}

export interface AStarRouteOptions {
  heuristic?: 'manhattan' | 'euclidean' | 'diagonal'
  bendPenalty?: number
  weight?: number
}

export function aStarRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: RouterConfig,
  options: AStarRouteOptions = {}
): RouteResult {
  const { heuristic = 'manhattan', bendPenalty = 20, weight = 1 } = options
  const { gridSize, padding, maxIterations } = config

  const bounds = calculateBounds(from, to, obstacles, padding)

  const startX = snapToGrid(from.x, gridSize)
  const startY = snapToGrid(from.y, gridSize)
  const endX = snapToGrid(to.x, gridSize)
  const endY = snapToGrid(to.y, gridSize)

  const obstacleGrid = buildObstacleGrid(obstacles, bounds, gridSize)

  const openHeap = createMinHeap<AStarNode>((n) => n.f)
  const allNodes = new Map<number, AStarNode>()
  const closedSet = new Set<number>()

  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristicFunc(startX, startY, endX, endY, heuristic),
    f: 0,
    parent: null,
    direction: null,
  }
  startNode.f = startNode.g + startNode.h * weight

  const startKey = toKey(startX, startY)
  openHeap.push(startNode)
  allNodes.set(startKey, startNode)

  let iterations = 0
  const directions: Array<[number, number, 'h' | 'v']> = [
    [0, -gridSize, 'v'],
    [gridSize, 0, 'h'],
    [0, gridSize, 'v'],
    [-gridSize, 0, 'h'],
  ]

  while (openHeap.length > 0 && iterations < maxIterations) {
    iterations++

    const current = openHeap.pop()
    if (!current) break

    const currentKey = toKey(current.x, current.y)

    if (current.x === endX && current.y === endY) {
      const path = reconstructPath(current)
      const smoothedPath = smoothPath(path, obstacleGrid, gridSize, bounds)
      return {
        points: connectEndpoints(smoothedPath, from, to),
        success: true,
        cost: current.g,
      }
    }

    closedSet.add(currentKey)

    for (const [dx, dy, dir] of directions) {
      const nx = current.x + dx
      const ny = current.y + dy
      const neighborKey = toKey(nx, ny)

      if (closedSet.has(neighborKey)) continue
      if (!isInBounds(nx, ny, bounds)) continue
      if (isBlocked(nx, ny, obstacleGrid, gridSize, bounds)) continue

      const isBend = current.direction !== null && current.direction !== dir
      const bendCost = isBend ? bendPenalty : 0
      const moveCost = config.orthogonalCost * gridSize + bendCost
      const tentativeG = current.g + moveCost

      let neighbor = allNodes.get(neighborKey)

      if (!neighbor) {
        neighbor = {
          x: nx,
          y: ny,
          g: tentativeG,
          h: heuristicFunc(nx, ny, endX, endY, heuristic),
          f: 0,
          parent: current,
          direction: dir,
        }
        neighbor.f = neighbor.g + neighbor.h * weight
        allNodes.set(neighborKey, neighbor)
        openHeap.push(neighbor)
      } else if (tentativeG < neighbor.g) {
        neighbor.g = tentativeG
        neighbor.f = neighbor.g + neighbor.h * weight
        neighbor.parent = current
        neighbor.direction = dir
        openHeap.push(neighbor)
      }
    }
  }

  return { points: [from, to], success: false }
}

function toKey(x: number, y: number): number {
  return x * 1000000 + y
}

function heuristicFunc(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: 'manhattan' | 'euclidean' | 'diagonal'
): number {
  const dx = Math.abs(x2 - x1)
  const dy = Math.abs(y2 - y1)

  switch (type) {
    case 'euclidean':
      return Math.sqrt(dx * dx + dy * dy)
    case 'diagonal':
      return Math.max(dx, dy) + (Math.sqrt(2) - 1) * Math.min(dx, dy)
    default:
      return dx + dy
  }
}

function buildObstacleGrid(obstacles: Obstacle[], bounds: Rect, gridSize: number): Set<number> {
  const blocked = new Set<number>()

  for (const obstacle of obstacles) {
    const expanded = expandRect(obstacle.bounds, obstacle.padding)

    const startX = Math.floor((expanded.x - bounds.x) / gridSize)
    const startY = Math.floor((expanded.y - bounds.y) / gridSize)
    const endX = Math.ceil((expanded.x + expanded.w - bounds.x) / gridSize)
    const endY = Math.ceil((expanded.y + expanded.h - bounds.y) / gridSize)

    for (let gx = startX; gx <= endX; gx++) {
      for (let gy = startY; gy <= endY; gy++) {
        blocked.add(toKey(gx, gy))
      }
    }
  }

  return blocked
}

function isBlocked(x: number, y: number, obstacleGrid: Set<number>, gridSize: number, bounds: Rect): boolean {
  const gx = Math.floor((x - bounds.x) / gridSize)
  const gy = Math.floor((y - bounds.y) / gridSize)
  return obstacleGrid.has(toKey(gx, gy))
}

function isInBounds(x: number, y: number, bounds: Rect): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.w && y >= bounds.y && y <= bounds.y + bounds.h
}

function reconstructPath(node: AStarNode): Point[] {
  const path: Point[] = []
  let current: AStarNode | null = node

  while (current) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }

  return path
}

function smoothPath(path: Point[], obstacleGrid: Set<number>, gridSize: number, bounds: Rect): Point[] {
  if (path.length <= 2) return path

  const smoothed: Point[] = [path[0]]
  let current = 0

  while (current < path.length - 1) {
    let farthest = current + 1

    for (let i = path.length - 1; i > current + 1; i--) {
      if (hasLineOfSight(path[current], path[i], obstacleGrid, gridSize, bounds)) {
        farthest = i
        break
      }
    }

    smoothed.push(path[farthest])
    current = farthest
  }

  return smoothed
}

function hasLineOfSight(p1: Point, p2: Point, obstacleGrid: Set<number>, gridSize: number, bounds: Rect): boolean {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) / gridSize

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = p1.x + dx * t
    const y = p1.y + dy * t

    const gx = Math.floor((x - bounds.x) / gridSize)
    const gy = Math.floor((y - bounds.y) / gridSize)

    if (obstacleGrid.has(toKey(gx, gy))) {
      return false
    }
  }

  return true
}

function connectEndpoints(path: Point[], from: Point, to: Point): Point[] {
  if (path.length === 0) return [from, to]

  const result: Point[] = [from]

  const first = path[0]
  if (first.x !== from.x || first.y !== from.y) {
    if (Math.abs(first.x - from.x) > Math.abs(first.y - from.y)) {
      result.push({ x: first.x, y: from.y })
    } else {
      result.push({ x: from.x, y: first.y })
    }
  }

  result.push(...path)

  const last = path[path.length - 1]
  if (last.x !== to.x || last.y !== to.y) {
    if (Math.abs(last.x - to.x) > Math.abs(last.y - to.y)) {
      result.push({ x: to.x, y: last.y })
    } else {
      result.push({ x: last.x, y: to.y })
    }
  }

  result.push(to)
  return simplifyOrthogonalPath(result)
}

export function createObstacleFromRect(id: string, rect: Rect, padding: number = 10): Obstacle {
  return { id, bounds: rect, padding }
}

export function findRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: Partial<RouterConfig> = {}
): RouteResult {
  const defaultConfig: RouterConfig = {
    gridSize: 10,
    padding: 15,
    maxIterations: 5000,
    diagonalCost: 1.414,
    orthogonalCost: 1,
  }

  return aStarRoute(from, to, obstacles, { ...defaultConfig, ...config })
}

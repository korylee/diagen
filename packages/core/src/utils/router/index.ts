import type { Point, Bounds } from '@diagen/shared'
import type { DiagramElement } from '../../model/diagram'
import { isShape } from '../../model/shape'
import { aStarRoute, type AStarRouteOptions, findRoute, createObstacleFromBounds } from './astar'
import { orthogonalRoute, type OrthogonalRouteOptions, findOrthogonalRoute } from './orthogonal'
import type { Obstacle, RouteResult, RouterConfig } from './types'
import { euclideanDistance } from './utils'

export type RouterAlgorithm = 'astar' | 'orthogonal' | 'hybrid'

export interface RouterOptions {
  algorithm?: RouterAlgorithm
  astarOptions?: AStarRouteOptions
  orthogonalOptions?: OrthogonalRouteOptions
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  gridSize: 10,
  padding: 15,
  maxIterations: 5000,
  diagonalCost: 1.414,
  orthogonalCost: 1,
}

export function route(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: Partial<RouterConfig> = {},
  options: RouterOptions = {},
): RouteResult {
  const mergedConfig = { ...DEFAULT_ROUTER_CONFIG, ...config }
  const algorithm = options.algorithm || 'hybrid'

  // 统一入口：按算法策略分派到具体求解器。
  switch (algorithm) {
    case 'astar':
      return aStarRoute(from, to, obstacles, mergedConfig, options.astarOptions)
    case 'orthogonal':
      return orthogonalRoute(from, to, obstacles, mergedConfig, options.orthogonalOptions)
    case 'hybrid':
    default:
      return hybridRoute(from, to, obstacles, mergedConfig, options)
  }
}

function hybridRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: RouterConfig,
  options: RouterOptions,
): RouteResult {
  // 先尝试正交路由：通常可读性更好且拐点更可控。
  const orthoResult = orthogonalRoute(from, to, obstacles, config, options.orthogonalOptions)

  if (orthoResult.success && orthoResult.cost !== undefined) {
    const directDistance = euclideanDistance(from, to)
    const pathEfficiency = directDistance / orthoResult.cost

    // 路径效率高且节点数少时，直接接受正交结果，避免不必要的 A* 搜索。
    if (pathEfficiency > 0.5 && orthoResult.points.length <= 6) {
      return orthoResult
    }
  }

  // 正交失败或成本过高时回退到 A*，提升复杂障碍场景的可达性。
  if (!orthoResult.success || (orthoResult.cost !== undefined && orthoResult.cost > 500)) {
    const astarResult = aStarRoute(from, to, obstacles, config, options.astarOptions)
    if (astarResult.success) {
      return astarResult
    }
  }

  return orthoResult
}

export function createObstaclesFromElements(elements: DiagramElement[], excludeIds: string[] = []): Obstacle[] {
  const obstacles: Obstacle[] = []
  const excludeSet = new Set(excludeIds)

  for (const element of elements) {
    if (excludeSet.has(element.id)) continue

    if (isShape(element)) {
      const props = element.props
      const bounds: Bounds = {
        x: props.x,
        y: props.y,
        w: props.w,
        h: props.h,
      }
      obstacles.push(createObstacleFromBounds(element.id, bounds, 10))
    }
  }

  return obstacles
}

export function calculateRoutePoints(
  from: Point,
  to: Point,
  elements: DiagramElement[],
  options: RouterOptions = {},
): Point[] {
  const obstacles = createObstaclesFromElements(elements)
  const result = route(from, to, obstacles, {}, options)
  return result.points
}

export { aStarRoute, orthogonalRoute, findRoute, findOrthogonalRoute }

export type { Obstacle, RouteResult, RouterConfig, AStarRouteOptions, OrthogonalRouteOptions }

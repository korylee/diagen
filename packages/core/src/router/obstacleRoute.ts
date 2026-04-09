import type { Bounds, Point } from '@diagen/shared'
import { isShape } from '../model'
import type { DiagramElement } from '../model'
import { aStarRoute, type AStarRouteOptions, createObstacleFromBounds } from './astar'
import { orthogonalRoute, type OrthogonalRouteOptions } from './orthogonal'
import type { Obstacle, RouteResult, RouterConfig } from './types'
import { euclideanDistance } from './utils'

/**
 * 障碍路由算法类型：
 * - `astar`：网格搜索，可达性更强
 * - `orthogonal`：正交优先，可读性更好
 * - `hybrid`：先正交后回退 A*
 */
export type RouterAlgorithm = 'astar' | 'orthogonal' | 'hybrid'

/**
 * 障碍路由参数。
 */
export interface RouterOptions {
  algorithm?: RouterAlgorithm
  astarOptions?: AStarRouteOptions
  orthogonalOptions?: OrthogonalRouteOptions
}

/**
 * 默认路由配置：
 * - 作为 `calculateObstacleRoute` 的基线
 * - 调用方可通过 `config` 局部覆盖
 */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  gridSize: 10,
  padding: 15,
  maxIterations: 5000,
  diagonalCost: 1.414,
  orthogonalCost: 1,
}

/**
 * hybrid 策略参数：
 * - 这些阈值用于控制“接受正交路径”与“回退 A*”的时机
 */
const HYBRID_ACCEPT_EFFICIENCY = 0.5
const HYBRID_ACCEPT_MAX_POINTS = 6
const HYBRID_FALLBACK_MAX_COST = 500

/**
 * 障碍规避路由统一入口。
 * 说明：
 * - 该入口只关心 point-to-point 路由，不处理 Linker 端点绑定语义
 * - Linker 语义分发由 `linkerRoute.ts` 承担
 */
export function calculateObstacleRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: Partial<RouterConfig> = {},
  options: RouterOptions = {},
): RouteResult {
  const mergedConfig = { ...DEFAULT_ROUTER_CONFIG, ...config }
  const algorithm = options.algorithm ?? 'hybrid'

  switch (algorithm) {
    case 'astar':
      return aStarRoute(from, to, obstacles, mergedConfig, options.astarOptions)
    case 'orthogonal':
      return orthogonalRoute(from, to, obstacles, mergedConfig, options.orthogonalOptions)
    case 'hybrid':
    default:
      return calculateHybridObstacleRoute(from, to, obstacles, mergedConfig, options)
  }
}

/**
 * 混合策略：
 * 1. 先尝试正交路径（更可读）
 * 2. 当正交失败或成本过高时回退 A*
 */
function calculateHybridObstacleRoute(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
  config: RouterConfig,
  options: RouterOptions,
): RouteResult {
  const orthogonalResult = orthogonalRoute(from, to, obstacles, config, options.orthogonalOptions)

  if (shouldAcceptOrthogonalResult(from, orthogonalResult)) {
    return orthogonalResult
  }

  const shouldFallbackToAStar =
    !orthogonalResult.success ||
    (orthogonalResult.cost !== undefined && orthogonalResult.cost > HYBRID_FALLBACK_MAX_COST)

  if (shouldFallbackToAStar) {
    const astarResult = aStarRoute(from, to, obstacles, config, options.astarOptions)
    if (astarResult.success) return astarResult
  }

  return orthogonalResult
}

function shouldAcceptOrthogonalResult(from: Point, result: RouteResult): boolean {
  if (!result.success || result.cost === undefined) return false

  const to = result.points[result.points.length - 1] ?? from
  const directDistance = euclideanDistance(from, to)
  const pathEfficiency = directDistance / result.cost

  return pathEfficiency > HYBRID_ACCEPT_EFFICIENCY && result.points.length <= HYBRID_ACCEPT_MAX_POINTS
}

/**
 * 由图元构建障碍物列表：
 * - 仅 shape 参与障碍建模
 * - 通过 `excludeIds` 可排除当前连线关联图元
 */
export function createObstaclesFromElements(elements: DiagramElement[], excludeIds: string[] = []): Obstacle[] {
  const obstacles: Obstacle[] = []
  const excludeSet = new Set(excludeIds)

  for (const element of elements) {
    if (excludeSet.has(element.id)) continue
    if (!isShape(element)) continue

    const bounds: Bounds = {
      x: element.props.x,
      y: element.props.y,
      w: element.props.w,
      h: element.props.h,
    }

    obstacles.push(createObstacleFromBounds(element.id, bounds, 10))
  }

  return obstacles
}

/**
 * 便捷入口：直接用元素列表计算路径点。
 */
export function calculateRoutePoints(
  from: Point,
  to: Point,
  elements: DiagramElement[],
  options: RouterOptions = {},
): Point[] {
  const obstacles = createObstaclesFromElements(elements)
  return calculateObstacleRoute(from, to, obstacles, {}, options).points
}

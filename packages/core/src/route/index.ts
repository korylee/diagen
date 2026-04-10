/**
 * Route Public API
 *
 * 设计原则：
 * - `linkerRoute` 处理 Linker 语义（端点绑定、角度、策略分发）
 * - `obstacleRoute` 处理点对点障碍规避（A-star/Orthogonal/Hybrid）
 * - `index.ts` 仅做统一导出，避免调用方穿透内部实现文件
 */

// Linker 语义路由
export {
  getBasicLinkerRoute,
  getLinkerRoute,
  type LinkerRouteJump,
  type LinkerRoute,
  type LinkerRouteOptions,
  type LinkerRouteStrategy
} from './linkerRoute'

export { calculateLineJumps, type CalculateLineJumpsOptions } from './lineJumps'
// 障碍规避路由
export {
  getObstacleRoute,
  getRoutePoints,
  getObstacles,
  DEFAULT_ROUTE_CONFIG,
  type RouteAlgorithm,
  type RouteOptions
} from './obstacleRoute'

// 低层算法入口（保留对高级场景的直接访问）
export { aStarRoute } from './astar'
export { orthogonalRoute } from './orthogonal'

// 核心类型
export type { AStarRouteOptions } from './astar'
export type { OrthogonalRouteOptions } from './orthogonal'
export type { Obstacle, RouteConfig, RouteContext, RouteResult } from './types'

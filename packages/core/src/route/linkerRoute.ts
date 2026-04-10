import type { Point } from '@diagen/shared'
import type { LinkerType } from '../constants'
import type { DiagramElement, LinkerElement, LinkerEndpoint, ShapeElement } from '../model'
import { getAnchorInfoById, resolvePerimeterInfo } from '../anchors'
import type { Obstacle, RouteConfig } from './types'
import { getObstacleRoute, getObstacles, type RouteOptions } from './obstacleRoute'

/**
 * 连线最终路由结果：
 * - `points` 为画布坐标系路径点
 * - `fromAngle` / `toAngle` 为端点出射角（弧度）
 */
export interface LinkerRoute {
  points: Point[]
  fromAngle: number
  toAngle: number
  jumps?: LinkerRouteJump[]
}

export interface LinkerRouteJump {
  segmentIndex: number
  center: Point
  orientation: 'horizontal' | 'vertical'
  radius: number
}

/**
 * 连线路由策略：
 * - `basic`：只根据连线类型生成路径，不做障碍规避
 * - `obstacle`：调用障碍规避路由器
 */
export type LinkerRouteStrategy = 'basic' | 'obstacle'

/**
 * 连线路由入口配置。
 */
export interface LinkerRouteOptions {
  /** 路由策略，默认 `basic` */
  strategy?: LinkerRouteStrategy
  /** 直接提供障碍物集合，优先级最高 */
  obstacles?: Obstacle[]
  /** 通过元素列表自动构建障碍物（当 `obstacles` 未提供时生效） */
  obstacleElements?: DiagramElement[]
  /** 构建障碍物时需要排除的元素 ID */
  excludeObstacleIds?: string[]
  /** 障碍规避路由基础配置 */
  obstacleConfig?: Partial<RouteConfig>
  /** 障碍规避路由算法配置 */
  obstacleOptions?: RouteOptions
  /** 障碍规避失败时是否回退到 basic，默认 `true` */
  fallbackToBasic?: boolean
}

interface ResolvedEndpoint {
  point: Point
  angle: number
}

/**
 * 基础连线路由：
 * - 保留原有 broken/orthogonal/curved 语义
 * - 不做障碍规避
 */
export function getBasicLinkerRoute(
  linker: LinkerElement,
  getShapeById: (id: string) => ShapeElement | undefined | null,
): LinkerRoute {
  const endpoints = resolveLinkerEndpoints(linker, getShapeById)
  return {
    points: calculateBasicRoutePoints(
      endpoints.from.point,
      endpoints.to.point,
      endpoints.from.angle,
      endpoints.to.angle,
      linker.linkerType,
      linker.points,
    ),
    fromAngle: endpoints.from.angle,
    toAngle: endpoints.to.angle,
  }
}

/**
 * 统一连线路由入口：
 * - 先做端点解析（point + angle）
 * - 再根据策略分发到 basic / obstacle
 */
export function getLinkerRoute(
  linker: LinkerElement,
  getShapeById: (id: string) => ShapeElement | undefined | null,
  options: LinkerRouteOptions = {},
): LinkerRoute {
  const { strategy = 'basic', fallbackToBasic = true } = options
  const endpoints = resolveLinkerEndpoints(linker, getShapeById)

  // 显式控制点优先：用户手动编辑的路由应无条件生效。
  if (linker.points.length > 0) {
    return {
      points: [endpoints.from.point, ...linker.points, endpoints.to.point],
      fromAngle: endpoints.from.angle,
      toAngle: endpoints.to.angle,
    }
  }

  if (strategy === 'obstacle') {
    const obstacles = resolveLinkerObstacles(linker, options)
    const obstacleRoute = getObstacleRoute(
      endpoints.from.point,
      endpoints.to.point,
      obstacles,
      options.obstacleConfig,
      options.obstacleOptions,
    )

    if (obstacleRoute.success && obstacleRoute.points.length >= 2) {
      return {
        points: obstacleRoute.points,
        fromAngle: endpoints.from.angle,
        toAngle: endpoints.to.angle,
      }
    }

    if (!fallbackToBasic) {
      return {
        points: obstacleRoute.points.length > 0 ? obstacleRoute.points : [endpoints.from.point, endpoints.to.point],
        fromAngle: endpoints.from.angle,
        toAngle: endpoints.to.angle,
      }
    }
  }

  return {
    points: calculateBasicRoutePoints(
      endpoints.from.point,
      endpoints.to.point,
      endpoints.from.angle,
      endpoints.to.angle,
      linker.linkerType,
      [],
    ),
    fromAngle: endpoints.from.angle,
    toAngle: endpoints.to.angle,
  }
}

function resolveLinkerEndpoints(
  linker: LinkerElement,
  getShapeById: (id: string) => ShapeElement | undefined | null,
): { from: ResolvedEndpoint; to: ResolvedEndpoint } {
  return {
    from: resolveEndpoint(linker.from, getShapeById),
    to: resolveEndpoint(linker.to, getShapeById),
  }
}

function resolveLinkerObstacles(linker: LinkerElement, options: LinkerRouteOptions): Obstacle[] {
  if (options.obstacles) return options.obstacles

  const excludeIds = new Set(options.excludeObstacleIds ?? [])
  if (linker.from.id) excludeIds.add(linker.from.id)
  if (linker.to.id) excludeIds.add(linker.to.id)

  return getObstacles(options.obstacleElements ?? [], Array.from(excludeIds))
}

/**
 * 基础路径生成器：
 * - `straight`：直线
 * - `curved`：三次贝塞尔（自动控制点）
 * - `broken`/`orthogonal`：按主方向做中点折线
 */
function calculateBasicRoutePoints(
  from: Point,
  to: Point,
  fromAngle: number,
  toAngle: number,
  linkerType: LinkerType,
  controlPoints: Point[],
): Point[] {
  const points: Point[] = [from]

  if (controlPoints.length > 0) {
    points.push(...controlPoints, to)
    return points
  }

  switch (linkerType) {
    case 'straight':
      points.push(to)
      break
    case 'curved': {
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
      const offset = Math.min(dist / 3, 50)
      points.push(
        { x: from.x + Math.cos(fromAngle) * offset, y: from.y + Math.sin(fromAngle) * offset },
        { x: to.x - Math.cos(toAngle) * offset, y: to.y - Math.sin(toAngle) * offset },
        to,
      )
      break
    }
    case 'broken':
    case 'orthogonal': {
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2
      const dx = Math.abs(to.x - from.x)
      const dy = Math.abs(to.y - from.y)

      if (dx > dy) {
        points.push({ x: midX, y: from.y }, { x: midX, y: to.y })
      } else {
        points.push({ x: from.x, y: midY }, { x: to.x, y: midY })
      }
      points.push(to)
      break
    }
    default:
      points.push(to)
  }

  return points
}

/**
 * 端点解析优先级：
 * 1. 固定锚点（fixed）
 * 2. 周边附着（perimeter）
 * 3. 回退到端点原始坐标（free/fallback）
 */
function resolveEndpoint(
  endpoint: LinkerEndpoint,
  getShapeById: (id: string) => ShapeElement | undefined | null,
): ResolvedEndpoint {
  const fallback: ResolvedEndpoint = {
    point: { x: endpoint.x, y: endpoint.y },
    angle: endpoint.angle ?? 0,
  }

  if (!endpoint.id) return fallback
  const shape = getShapeById(endpoint.id)
  if (!shape) return fallback

  const binding = endpoint.binding
  if (binding.type === 'free') return fallback

  if (binding.type === 'fixed') {
    const info = getAnchorInfoById(shape, binding.anchorId)
    if (!info) return fallback
    return {
      point: info.point,
      angle: info.angle,
    }
  }

  const info = resolvePerimeterInfo(shape, binding)
  if (!info) return fallback
  return {
    point: info.point,
    angle: info.angle,
  }
}

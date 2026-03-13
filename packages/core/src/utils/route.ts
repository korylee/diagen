import type { Point } from '@diagen/shared'
import type { LinkerType } from '../constants'
import type { LinkerElement, LinkerEndpoint, ShapeElement } from '../model'
import { getShapeAnchorInfoById, resolveShapePerimeterInfo } from './anchors'

export interface LinkerRoute {
  points: Point[]
  fromAngle: number
  toAngle: number
}

export function calculateLinkerRoute(
  linker: LinkerElement,
  getShapeById: (id: string) => ShapeElement | undefined | null,
): LinkerRoute {
  const { from, to, linkerType, points: controlPoints } = linker

  const fromResolved = resolveEndpoint(linker.from, getShapeById)
  const toResolved = resolveEndpoint(linker.to, getShapeById)

  const routePoints = calculateRoutePoints(
    fromResolved.point,
    toResolved.point,
    fromResolved.angle,
    toResolved.angle,
    linkerType,
    controlPoints,
  )
  return { points: routePoints, fromAngle: fromResolved.angle, toAngle: toResolved.angle }
}

function calculateRoutePoints(
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

function resolveEndpoint(
  endpoint: LinkerEndpoint,
  getShapeById: (id: string) => ShapeElement | undefined | null,
): { point: Point; angle: number } {
  const fallback = {
    point: { x: endpoint.x, y: endpoint.y },
    angle: endpoint.angle ?? 0,
  }

  if (!endpoint.id) return fallback
  const shape = getShapeById(endpoint.id)
  if (!shape) return fallback

  const binding = endpoint.binding
  if (binding.type === 'free') return fallback

  if (binding.type === 'fixed') {
    const info = getShapeAnchorInfoById(shape, binding.anchorId)
    if (!info) return fallback
    return {
      point: info.point,
      angle: info.angle,
    }
  }

  const info = resolveShapePerimeterInfo(shape, binding)
  if (!info) return fallback
  return {
    point: info.point,
    angle: info.angle,
  }
}

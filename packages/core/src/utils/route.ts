import { Point } from '@diagen/shared'
import { LinkerType } from '../constants'
import { LinkerElement, ShapeElement } from '../model'
import { getAnchorAngle, resolveAnchors } from './anchors'

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

  let fromPoint: Point = { x: from.x, y: from.y }
  let toPoint: Point = { x: to.x, y: to.y }
  let fromAngle = from.angle ?? 0
  let toAngle = to.angle ?? 0

  if (from.id) {
    const shape = getShapeById(from.id)
    if (shape && from.anchorIndex !== undefined) {
      const anchors = resolveAnchors(shape.anchors, shape.props.w, shape.props.h)
      if (anchors[from.anchorIndex]) {
        fromPoint = { x: shape.props.x + anchors[from.anchorIndex].x, y: shape.props.y + anchors[from.anchorIndex].y }
        fromAngle = getAnchorAngle(anchors[from.anchorIndex], shape.props.w, shape.props.h)
      }
    }
  }

  if (to.id) {
    const shape = getShapeById(to.id)
    if (shape && to.anchorIndex !== undefined) {
      const anchors = resolveAnchors(shape.anchors, shape.props.w, shape.props.h)
      if (anchors[to.anchorIndex]) {
        toPoint = { x: shape.props.x + anchors[to.anchorIndex].x, y: shape.props.y + anchors[to.anchorIndex].y }
        toAngle = getAnchorAngle(anchors[to.anchorIndex], shape.props.w, shape.props.h)
      }
    }
  }

  const routePoints = calculateRoutePoints(fromPoint, toPoint, fromAngle, toAngle, linkerType, controlPoints)
  return { points: routePoints, fromAngle, toAngle }
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

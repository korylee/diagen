/**
 * Anchor Utilities
 * 用于计算图形锚点（连线连接点）的位置
 */

import type { Point } from '@diagen/shared'
import type { ShapeElement, Anchor } from '../model'
import { evaluateExpression, resolvePoints } from './expression'

/**
 * 解析锚点数组为绝对坐标（相对于图形的坐标）
 * @param anchors 锚点定义数组
 * @param w 图形宽度
 * @param h 图形高度
 * @returns 解析后的坐标点数组（相对于图形左上角）
 */
export function resolveAnchors(
  anchors: Array<{ x: number | string; y: number | string }>,
  w: number,
  h: number
): Point[] {
  return resolvePoints(anchors, w, h)
}

/**
 * 获取图形锚点的绝对坐标
 * @param shape 图形元素
 * @returns 锚点坐标数组（画布绝对坐标）
 */
export function getShapeAnchors(shape: ShapeElement): Point[] {
  const { anchors, props } = shape
  const relativeAnchors = resolveAnchors(anchors, props.w, props.h)
  return relativeAnchors.map(p => ({
    x: props.x + p.x,
    y: props.y + p.y,
  }))
}

/**
 * 获取图形指定锚点的绝对坐标
 * @param shape 图形元素
 * @param anchorIndex 锚点索引
 * @returns 锚点坐标（画布绝对坐标），索引无效时返回 null
 */
export function getShapeAnchorPosition(shape: ShapeElement, anchorIndex: number): Point | null {
  if (!shape.anchors || anchorIndex >= shape.anchors.length) return null

  const anchor = shape.anchors[anchorIndex]
  const ax = evaluateExpression(anchor.x, shape.props.w, shape.props.h)
  const ay = evaluateExpression(anchor.y, shape.props.w, shape.props.h)

  return {
    x: shape.props.x + ax,
    y: shape.props.y + ay,
  }
}

/**
 * 计算锚点相对于图形中心的角度
 * @param anchor 锚点坐标（相对于图形左上角）
 * @param w 图形宽度
 * @param h 图形高度
 * @returns 角度（弧度）
 */
export function getAnchorAngle(anchor: Point, w: number, h: number): number {
  const cx = w / 2
  const cy = h / 2
  return Math.atan2(anchor.y - cy, anchor.x - cx)
}

/**
 * 根据角度获取最近的锚点索引
 * @param angle 角度（弧度）
 * @param anchors 锚点数组
 * @param w 图形宽度
 * @param h 图形高度
 * @returns 最近的锚点索引
 */
export function getNearestAnchorIndex(
  angle: number,
  anchors: Anchor[],
  w: number,
  h: number
): number {
  if (anchors.length === 0) return -1

  const resolvedAnchors = resolveAnchors(anchors, w, h)
  let minDiff = Infinity
  let nearestIndex = 0

  for (let i = 0; i < resolvedAnchors.length; i++) {
    const anchorAngle = getAnchorAngle(resolvedAnchors[i], w, h)
    // 计算角度差（考虑周期性）
    let diff = Math.abs(angle - anchorAngle)
    if (diff > Math.PI) diff = 2 * Math.PI - diff

    if (diff < minDiff) {
      minDiff = diff
      nearestIndex = i
    }
  }

  return nearestIndex
}

/**
 * 获取锚点的方向（用于连线方向判断）
 * @param anchor 锚点定义
 * @returns 方向字符串
 */
export function getAnchorDirection(anchor: Anchor): 'top' | 'right' | 'bottom' | 'left' | 'center' {
  return anchor.direction ?? 'center'
}

/**
 * 根据方向获取锚点的默认角度
 * @param direction 方向
 * @returns 角度（弧度）
 */
export function getDirectionAngle(direction: 'top' | 'right' | 'bottom' | 'left' | 'center'): number {
  switch (direction) {
    case 'top': return -Math.PI / 2
    case 'right': return 0
    case 'bottom': return Math.PI / 2
    case 'left': return Math.PI
    default: return 0
  }
}

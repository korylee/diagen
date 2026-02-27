/**
 * Shape Keypoints Utility
 * 用于计算图形的关键点（hover/选中时显示的圆点位置）
 */

import type { Point } from '@diagen/shared'
import type { ShapeElement } from '../model'
import { evaluateExpression, resolvePoints } from './expression'

/**
 * 关键点定义（相对坐标表达式）
 */
export interface KeypointDefinition {
  x: string | number
  y: string | number
}

/**
 * 将相对坐标关键点转换为绝对坐标
 */
function keypointsToAbsolute(
  keypoints: KeypointDefinition[],
  props: { x: number; y: number; w: number; h: number }
): Point[] {
  const { x, y, w, h } = props
  const relativePoints = resolvePoints(keypoints, w, h)
  return relativePoints.map(p => ({ x: x + p.x, y: y + p.y }))
}

/**
 * 注册自定义图形的关键点配置
 */
const customKeypoints = new Map<string, KeypointDefinition[]>()

/**
 * 内置图形的关键点配置
 * 关键点原则：用户真正需要操作的点，数量控制在 2-8 个
 */
const BUILTIN_KEYPOINTS: Record<string, KeypointDefinition[]> = {
  // 矩形/圆角矩形 - 四角
  rectangle: [
    { x: 0, y: 0 },
    { x: 'w', y: 0 },
    { x: 'w', y: 'h' },
    { x: 0, y: 'h' },
  ],
  roundedRectangle: [
    { x: 0, y: 0 },
    { x: 'w', y: 0 },
    { x: 'w', y: 'h' },
    { x: 0, y: 'h' },
  ],

  // 椭圆/圆形 - 上下左右极值点
  ellipse: [
    { x: 'w/2', y: 0 },
    { x: 'w', y: 'h/2' },
    { x: 'w/2', y: 'h' },
    { x: 0, y: 'h/2' },
  ],
  circle: [
    { x: 'w/2', y: 0 },
    { x: 'w', y: 'h/2' },
    { x: 'w/2', y: 'h' },
    { x: 0, y: 'h/2' },
  ],

  // 菱形 - 四顶点
  diamond: [
    { x: 'w/2', y: 0 },
    { x: 'w', y: 'h/2' },
    { x: 'w/2', y: 'h' },
    { x: 0, y: 'h/2' },
  ],

  // 平行四边形 - 四顶点
  parallelogram: [
    { x: 20, y: 0 },
    { x: 'w', y: 0 },
    { x: 'w-20', y: 'h' },
    { x: 0, y: 'h' },
  ],
}

/**
 * 从路径中提取关键点
 * 提取 move 和 line 动作的坐标作为顶点
 */
function extractKeypointsFromPath(
  path: ShapeElement['path'],
  props: { x: number; y: number; w: number; h: number }
): Point[] {
  const points: Point[] = []
  const { x, y, w, h } = props

  for (const pathDef of path) {
    for (const action of pathDef.actions) {
      if (action.action === 'move' || action.action === 'line') {
        if (action.x !== undefined && action.y !== undefined) {
          const px = evaluateExpression(action.x, w, h)
          const py = evaluateExpression(action.y, w, h)
          points.push({ x: x + px, y: y + py })
        }
      }
    }
  }

  // 去重
  const uniquePoints: Point[] = []
  for (const p of points) {
    if (!uniquePoints.some(up => up.x === p.x && up.y === p.y)) {
      uniquePoints.push(p)
    }
  }

  return uniquePoints
}

/**
 * 获取图形的关键点
 * @param shape 图形元素
 * @returns 关键点坐标数组（绝对坐标）
 */
export function getShapeKeypoints(shape: ShapeElement): Point[] {
  const { name, props, path } = shape

  // 1. 查找自定义注册的关键点配置
  const custom = customKeypoints.get(name)
  if (custom) {
    return keypointsToAbsolute(custom, props)
  }

  // 2. 查找内置关键点配置
  const builtinKeypoints = BUILTIN_KEYPOINTS[name]
  if (builtinKeypoints) {
    return keypointsToAbsolute(builtinKeypoints, props)
  }

  // 3. 从路径中提取关键点
  const pathKeypoints = extractKeypointsFromPath(path, props)
  if (pathKeypoints.length > 0) {
    return pathKeypoints
  }

  // 4. 兜底：使用图形中心
  return [{ x: props.x + props.w / 2, y: props.y + props.h / 2 }]
}

/**
 * 注册自定义图形的关键点配置
 */
export function registerShapeKeypoints(shapeName: string, keypoints: KeypointDefinition[]): void {
  customKeypoints.set(shapeName, keypoints)
}
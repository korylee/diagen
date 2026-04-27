/**
 * Anchor Utilities
 * 用于计算图形锚点（连线连接点）的位置
 */

import { isSamePoint, rotatePoint, type Point } from '@diagen/shared'
import type { Anchor, LinkerEndpointBinding, ShapeElement } from '../model'
import { evaluateExpression, evaluatePoint } from '../expression'
import { getCubicPoint } from '../_internal'

export type AnchorDirection = 'top' | 'right' | 'bottom' | 'left' | 'center'

export interface AnchorInfo {
  index: number
  id: string
  direction: AnchorDirection
  point: Point
  angle: number
}

export interface CreateAnchorInfo extends AnchorInfo {
  type: 'anchor'
}

export type CreateAnchor = CreateAnchorInfo | EdgeInfo

export interface ResolveCreateAnchorOptions {
  preferredDirections?: AnchorDirection[]
}

type EdgeBinding = Extract<LinkerEndpointBinding, { type: 'edge' }>

export interface EdgeInfo extends EdgeBinding {
  point: Point
  angle: number
  distance: number
}

interface PathPolyline {
  pathIndex: number
  points: Point[]
  closed: boolean
}

interface ShapeEdgeSegment {
  pathIndex: number
  segmentIndex: number
  fromLocal: Point
  toLocal: Point
  fromCanvas: Point
  toCanvas: Point
}

function toRadians(angle: number): number {
  return (angle * Math.PI) / 180
}

function normalizeAngle(angle: number): number {
  let value = angle
  while (value <= -Math.PI) value += Math.PI * 2
  while (value > Math.PI) value -= Math.PI * 2
  return value
}

function pushPoint(points: Point[], point: Point): void {
  if (points.length === 0 || !isSamePoint(points[points.length - 1], point)) {
    points.push(point)
  }
}

function evaluatePathValue(value: number | string | undefined, w: number, h: number): number {
  if (value === undefined) return 0
  return evaluateExpression(value, { w, h })
}

function sampleQuadraticBezier(p0: Point, p1: Point, p2: Point, segments: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const mt = 1 - t
    points.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    })
  }
  return points
}

function sampleCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, segments: number): Point[] {
  const points: Point[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    points.push(getCubicPoint(p0, p1, p2, p3, t))
  }
  return points
}

function normalizeVector(vector: Point): Point | null {
  const len = Math.hypot(vector.x, vector.y)
  if (len <= 1e-8) return null
  return { x: vector.x / len, y: vector.y / len }
}

function localToCanvasPoint(shape: ShapeElement, point: Point): Point {
  const { y, x, w, h, angle } = shape.props
  const rotated = rotatePoint(point, angle, { x: w / 2, y: h / 2 })
  return {
    x: x + rotated.x,
    y: y + rotated.y,
  }
}

/**
 * 解析锚点数组为绝对坐标（相对于图形的坐标）
 */
export function resolveAnchors(
  anchors: Array<{ x: number | string; y: number | string }>,
  w: number,
  h: number,
): Point[] {
  return anchors.map(anchor => evaluatePoint(anchor, { w, h }))
}

function getAnchorId(shape: ShapeElement, anchorIndex: number): string {
  return shape.anchors[anchorIndex]?.id ?? String(anchorIndex)
}

export function getAnchorIndexById(shape: ShapeElement, anchorId: string): number {
  for (let i = 0; i < shape.anchors.length; i++) {
    if (getAnchorId(shape, i) === anchorId) return i
  }
  return -1
}

/**
 * 获取图形锚点的绝对坐标
 */
export function getAnchors(shape: ShapeElement): Point[] {
  const { anchors, props } = shape
  const localAnchors = resolveAnchors(anchors, props.w, props.h)
  return localAnchors.map(anchor => {
    const rotated = rotatePoint(anchor, props.angle, { x: props.w / 2, y: props.h / 2 })

    return {
      x: props.x + rotated.x,
      y: props.y + rotated.y,
    }
  })
}

/**
 * 获取图形指定锚点的绝对坐标
 */
export function getAnchorPoint(shape: ShapeElement, anchorIndex: number): Point | null {
  if (!shape.anchors || anchorIndex < 0 || anchorIndex >= shape.anchors.length) return null
  const anchor = shape.anchors[anchorIndex]
  const { props } = shape
  const ax = evaluateExpression(anchor.x, props)
  const ay = evaluateExpression(anchor.y, props)
  const rotated = rotatePoint({ x: ax, y: ay }, props.angle, { x: props.w / 2, y: props.h / 2 })

  return {
    x: props.x + rotated.x,
    y: props.y + rotated.y,
  }
}

export function getAnchorPointById(shape: ShapeElement, anchorId: string): Point | null {
  const index = getAnchorIndexById(shape, anchorId)
  if (index < 0) return null
  return getAnchorPoint(shape, index)
}

function resolveShapePathPolylines(shape: ShapeElement): PathPolyline[] {
  const { path, props } = shape
  const { w, h } = props
  const polylines: PathPolyline[] = []

  for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
    const pathDef = path[pathIndex]
    let current: PathPolyline | null = null
    let currentPoint: Point | null = null
    let startPoint: Point | null = null

    for (const action of pathDef.actions) {
      if (action.action === 'move') {
        if (current && current.points.length >= 2) {
          polylines.push(current)
        }
        const point = {
          x: evaluatePathValue(action.x, w, h),
          y: evaluatePathValue(action.y, w, h),
        }
        current = { pathIndex, points: [point], closed: false }
        currentPoint = point
        startPoint = point
        continue
      }

      if (action.action === 'line') {
        const point = {
          x: evaluatePathValue(action.x, w, h),
          y: evaluatePathValue(action.y, w, h),
        }
        if (!current) {
          current = { pathIndex, points: [], closed: false }
        }
        pushPoint(current.points, point)
        currentPoint = point
        continue
      }

      if (action.action === 'rect') {
        const x = evaluatePathValue(action.x, w, h)
        const y = evaluatePathValue(action.y, w, h)
        const rectW = evaluatePathValue(action.w, w, h)
        const rectH = evaluatePathValue(action.h, w, h)
        polylines.push({
          pathIndex,
          closed: true,
          points: [
            { x, y },
            { x: x + rectW, y },
            { x: x + rectW, y: y + rectH },
            { x, y: y + rectH },
            { x, y },
          ],
        })
        current = null
        currentPoint = null
        startPoint = null
        continue
      }

      if (action.action === 'quadraticCurve') {
        const from = currentPoint ?? { x: 0, y: 0 }
        const cp = {
          x: evaluatePathValue(action.x1, w, h),
          y: evaluatePathValue(action.y1, w, h),
        }
        const to = {
          x: evaluatePathValue(action.x, w, h),
          y: evaluatePathValue(action.y, w, h),
        }
        const sampled = sampleQuadraticBezier(from, cp, to, 16)
        if (!current) {
          current = { pathIndex, points: [from], closed: false }
          if (!startPoint) startPoint = from
        }
        for (let i = 1; i < sampled.length; i++) {
          pushPoint(current.points, sampled[i])
        }
        currentPoint = to
        continue
      }

      if (action.action === 'curve') {
        const from = currentPoint ?? { x: 0, y: 0 }
        const cp1 = {
          x: evaluatePathValue(action.x1, w, h),
          y: evaluatePathValue(action.y1, w, h),
        }
        const cp2 = {
          x: evaluatePathValue(action.x2, w, h),
          y: evaluatePathValue(action.y2, w, h),
        }
        const to = {
          x: evaluatePathValue(action.x, w, h),
          y: evaluatePathValue(action.y, w, h),
        }
        const sampled = sampleCubicBezier(from, cp1, cp2, to, 20)
        if (!current) {
          current = { pathIndex, points: [from], closed: false }
          if (!startPoint) startPoint = from
        }
        for (let i = 1; i < sampled.length; i++) {
          pushPoint(current.points, sampled[i])
        }
        currentPoint = to
        continue
      }

      if (action.action === 'close') {
        if (current && startPoint) {
          current.closed = true
          pushPoint(current.points, startPoint)
        }
      }
    }

    if (current && current.points.length >= 2) {
      polylines.push(current)
    }
  }

  return polylines
}

function resolveShapeEdgeSegments(shape: ShapeElement, polylines: PathPolyline[]): ShapeEdgeSegment[] {
  const segments: ShapeEdgeSegment[] = []

  for (const polyline of polylines) {
    for (let i = 0; i < polyline.points.length - 1; i++) {
      const fromLocal = polyline.points[i]
      const toLocal = polyline.points[i + 1]
      if (isSamePoint(fromLocal, toLocal)) continue
      segments.push({
        pathIndex: polyline.pathIndex,
        segmentIndex: i,
        fromLocal,
        toLocal,
        fromCanvas: localToCanvasPoint(shape, fromLocal),
        toCanvas: localToCanvasPoint(shape, toLocal),
      })
    }
  }

  return segments
}

function projectPointToSegment(point: Point, start: Point, end: Point): { t: number; distance: number } {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared <= 1e-8) {
    return {
      t: 0,
      distance: Math.hypot(point.x - start.x, point.y - start.y),
    }
  }

  const rawT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, rawT))
  const projected = {
    x: start.x + t * dx,
    y: start.y + t * dy,
  }

  return {
    t,
    distance: Math.hypot(point.x - projected.x, point.y - projected.y),
  }
}

function isPointInPolygon(point: Point, points: Point[]): boolean {
  if (points.length < 3) return false

  let inside = false
  let j = points.length - 1

  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[j]
    const onDifferentSides = a.y > point.y !== b.y > point.y
    if (onDifferentSides) {
      const intersectionX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      if (point.x < intersectionX) inside = !inside
    }
    j = i
  }

  return inside
}

function isPointInShapeLocal(point: Point, paths: PathPolyline[]): boolean {
  let inside = false
  for (const path of paths) {
    if (!path.closed || path.points.length < 4) continue
    inside = inside !== isPointInPolygon(point, path.points)
  }
  return inside
}

function resolveOutwardNormalAngle(
  shape: ShapeElement,
  localPoint: Point,
  canvasPoint: Point,
  tangentLocal: Point,
  tangentCanvas: Point,
  paths: PathPolyline[],
): number | null {
  const localTangent = normalizeVector(tangentLocal)
  const canvasTangent = normalizeVector(tangentCanvas)
  if (!localTangent || !canvasTangent) return null

  const localNormalA = { x: -localTangent.y, y: localTangent.x }
  const localNormalB = { x: localTangent.y, y: -localTangent.x }
  const canvasNormalA = { x: -canvasTangent.y, y: canvasTangent.x }
  const canvasNormalB = { x: canvasTangent.y, y: -canvasTangent.x }
  const epsilon = Math.max(2, Math.min(shape.props.w, shape.props.h) * 0.05)

  const testA = {
    x: localPoint.x + localNormalA.x * epsilon,
    y: localPoint.y + localNormalA.y * epsilon,
  }
  const testB = {
    x: localPoint.x + localNormalB.x * epsilon,
    y: localPoint.y + localNormalB.y * epsilon,
  }
  const insideA = isPointInShapeLocal(testA, paths)
  const insideB = isPointInShapeLocal(testB, paths)

  let outward = canvasNormalA
  if (insideA !== insideB) {
    outward = insideA ? canvasNormalB : canvasNormalA
  } else {
    const center = {
      x: shape.props.x + shape.props.w / 2,
      y: shape.props.y + shape.props.h / 2,
    }
    const radial = { x: canvasPoint.x - center.x, y: canvasPoint.y - center.y }
    const dotA = radial.x * canvasNormalA.x + radial.y * canvasNormalA.y
    const dotB = radial.x * canvasNormalB.x + radial.y * canvasNormalB.y
    outward = dotA >= dotB ? canvasNormalA : canvasNormalB
  }

  return normalizeAngle(Math.atan2(outward.y, outward.x))
}

function buildEdgeInfo(
  shape: ShapeElement,
  paths: PathPolyline[],
  segment: ShapeEdgeSegment,
  t: number,
  distance: number,
): EdgeInfo | null {
  const clampedT = Math.max(0, Math.min(1, t))
  const localPoint = {
    x: segment.fromLocal.x + (segment.toLocal.x - segment.fromLocal.x) * clampedT,
    y: segment.fromLocal.y + (segment.toLocal.y - segment.fromLocal.y) * clampedT,
  }
  const canvasPoint = {
    x: segment.fromCanvas.x + (segment.toCanvas.x - segment.fromCanvas.x) * clampedT,
    y: segment.fromCanvas.y + (segment.toCanvas.y - segment.fromCanvas.y) * clampedT,
  }
  const tangentLocal = {
    x: segment.toLocal.x - segment.fromLocal.x,
    y: segment.toLocal.y - segment.fromLocal.y,
  }
  const tangentCanvas = rotatePoint(tangentLocal, shape.props.angle)
  const angle = resolveOutwardNormalAngle(shape, localPoint, canvasPoint, tangentLocal, tangentCanvas, paths)
  if (angle === null) return null

  return {
    type: 'edge',
    pathIndex: segment.pathIndex,
    segmentIndex: segment.segmentIndex,
    t: clampedT,
    point: canvasPoint,
    angle,
    distance,
  }
}

export function resolveEdgeInfo(shape: ShapeElement, binding: EdgeBinding): EdgeInfo | null {
  const paths = resolveShapePathPolylines(shape)
  const segments = resolveShapeEdgeSegments(shape, paths)
  const segment = segments.find(s => s.pathIndex === binding.pathIndex && s.segmentIndex === binding.segmentIndex)
  if (!segment) return null
  return buildEdgeInfo(shape, paths, segment, binding.t, 0)
}

export function getEdgeInfo(shape: ShapeElement, point: Point): EdgeInfo | null {
  const paths = resolveShapePathPolylines(shape)
  const segments = resolveShapeEdgeSegments(shape, paths)
  if (segments.length === 0) return null

  let bestSegment: ShapeEdgeSegment | null = null
  let bestProjection: { t: number; distance: number } | null = null

  for (const segment of segments) {
    const projection = projectPointToSegment(point, segment.fromCanvas, segment.toCanvas)
    if (!bestProjection || projection.distance < bestProjection.distance) {
      bestProjection = projection
      bestSegment = segment
    }
  }

  if (!bestSegment || !bestProjection) return null
  return buildEdgeInfo(shape, paths, bestSegment, bestProjection.t, bestProjection.distance)
}

/**
 * 基于路径边界估算锚点法线角（局部坐标）
 * 参考 ProcessOn 的边界法线思想
 */
export function getBoundaryNormalAngle(shape: ShapeElement, localPoint: Point): number | null {
  const canvasPoint = localToCanvasPoint(shape, localPoint)
  const edgeInfo = getEdgeInfo(shape, canvasPoint)
  return edgeInfo?.angle ?? null
}

/**
 * 获取图形锚点的切线/出射角（弧度）
 * 规则：
 * - 优先使用锚点 direction（再叠加图形旋转）
 * - 否则使用路径边界外法线角
 * - 若无法从路径求解，则回退到径向角
 */
export function getAnchorAngle(shape: ShapeElement, anchorIndex: number): number | null {
  if (!shape.anchors || anchorIndex < 0 || anchorIndex >= shape.anchors.length) return null

  const anchorDef = shape.anchors[anchorIndex]
  if (anchorDef?.direction) {
    return normalizeAngle(getDirectionAngle(anchorDef.direction) + toRadians(shape.props.angle))
  }

  const localAnchor = {
    x: evaluateExpression(anchorDef.x, shape.props),
    y: evaluateExpression(anchorDef.y, shape.props),
  }

  const boundaryAngle = getBoundaryNormalAngle(shape, localAnchor)
  if (boundaryAngle !== null) {
    return normalizeAngle(boundaryAngle)
  }

  return normalizeAngle(getRadialAngle(localAnchor, shape.props.w, shape.props.h) + toRadians(shape.props.angle))
}

export function getAnchorAngleById(shape: ShapeElement, anchorId: string): number | null {
  const index = getAnchorIndexById(shape, anchorId)
  if (index < 0) return null
  return getAnchorAngle(shape, index)
}

/**
 * 获取图形指定锚点的完整信息（位置 + 方向 + 角度）
 */
export function getAnchorInfo(shape: ShapeElement, anchorIndex: number): AnchorInfo | null {
  if (!shape.anchors || anchorIndex < 0 || anchorIndex >= shape.anchors.length) return null

  const point = getAnchorPoint(shape, anchorIndex)
  const angle = getAnchorAngle(shape, anchorIndex)
  if (!point || angle === null) return null

  const anchorDef = shape.anchors[anchorIndex]
  return {
    index: anchorIndex,
    id: getAnchorId(shape, anchorIndex),
    direction: anchorDef.direction ?? 'center',
    point,
    angle,
  }
}

export function getAnchorInfoById(shape: ShapeElement, anchorId: string): AnchorInfo | null {
  const index = getAnchorIndexById(shape, anchorId)
  if (index < 0) return null
  return getAnchorInfo(shape, index)
}

interface CreateAnchorCandidate {
  index: number
  id: string
  direction: AnchorDirection
  point: Point
}

function toCreateAnchor(shape: ShapeElement, candidate: CreateAnchorCandidate): CreateAnchorInfo | null {
  const angle = getAnchorAngle(shape, candidate.index)
  if (angle === null) return null
  return {
    type: 'anchor',
    ...candidate,
    angle,
  }
}

function getAnchorCandidates(shape: ShapeElement): CreateAnchorCandidate[] {
  const anchors: CreateAnchorCandidate[] = []
  for (let index = 0; index < shape.anchors.length; index++) {
    const point = getAnchorPoint(shape, index)
    if (!point) continue
    const anchorDef = shape.anchors[index]
    anchors.push({
      index,
      id: getAnchorId(shape, index),
      direction: anchorDef.direction ?? 'center',
      point,
    })
  }
  return anchors
}

function findAnchorByDirections(
  anchors: CreateAnchorCandidate[],
  directions: AnchorDirection[],
): CreateAnchorCandidate | null {
  if (anchors.length === 0 || directions.length === 0) return null

  const anchorByDirection = new Map<AnchorDirection, CreateAnchorCandidate>()
  for (const anchor of anchors) {
    if (!anchorByDirection.has(anchor.direction)) {
      anchorByDirection.set(anchor.direction, anchor)
    }
  }

  for (const direction of directions) {
    const matched = anchorByDirection.get(direction)
    if (matched) return matched
  }
  return null
}

function comparePreferredAnchors(a: CreateAnchorCandidate, b: CreateAnchorCandidate, reference: Point): number {
  const aDistance = Math.hypot(a.point.x - reference.x, a.point.y - reference.y)
  const bDistance = Math.hypot(b.point.x - reference.x, b.point.y - reference.y)
  const distanceDiff = aDistance - bDistance
  if (Math.abs(distanceDiff) > 1e-6) return distanceDiff

  const xDiff = b.point.x - a.point.x
  if (Math.abs(xDiff) > 1e-6) return xDiff

  const yDiff = a.point.y - b.point.y
  if (Math.abs(yDiff) > 1e-6) return yDiff

  return a.index - b.index
}

/**
 * 解析快捷建线的首选 source anchor
 * 规则：
 * - 优先使用指定 direction 的固定锚点
 * - 否则选择最靠近图形右上参考点的固定锚点
 * - 最后回退到 edge 绑定
 */
export function resolveCreateAnchor(shape: ShapeElement, options?: ResolveCreateAnchorOptions): CreateAnchor | null {
  const directions = options?.preferredDirections ?? ['right', 'top']
  const anchorCandidates = getAnchorCandidates(shape)
  const matched = findAnchorByDirections(anchorCandidates, directions)

  if (matched) {
    const anchor = toCreateAnchor(shape, matched)
    if (anchor) return anchor
  }
  const reference = {
    x: shape.props.x + shape.props.w,
    y: shape.props.y,
  }
  if (anchorCandidates.length === 0) return getEdgeInfo(shape, reference)

  const sortedCandidates = [...anchorCandidates].sort((a, b) => comparePreferredAnchors(a, b, reference))
  for (const candidate of sortedCandidates) {
    const anchor = toCreateAnchor(shape, candidate)
    if (anchor) return anchor
  }

  return getEdgeInfo(shape, reference)
}

/**
 * 计算锚点相对于图形中心的角度
 */
export function getRadialAngle(anchor: Point, w: number, h: number): number {
  const cx = w / 2
  const cy = h / 2
  return Math.atan2(anchor.y - cy, anchor.x - cx)
}

/**
 * 根据角度获取最近的锚点索引
 */
export function getNearestAnchorIndex(angle: number, anchors: Anchor[], w: number, h: number): number {
  if (anchors.length === 0) return -1

  const resolvedAnchors = resolveAnchors(anchors, w, h)
  let minDiff = Infinity
  let nearestIndex = 0

  for (let i = 0; i < resolvedAnchors.length; i++) {
    const anchorAngle = getRadialAngle(resolvedAnchors[i], w, h)
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
 */
export function getAnchorDirection(anchor: Anchor): AnchorDirection {
  return anchor.direction ?? 'center'
}

/**
 * 根据方向获取锚点的默认角度
 */
export function getDirectionAngle(direction: AnchorDirection): number {
  switch (direction) {
    case 'top':
      return -Math.PI / 2
    case 'right':
      return 0
    case 'bottom':
      return Math.PI / 2
    case 'left':
      return Math.PI
    default:
      return 0
  }
}

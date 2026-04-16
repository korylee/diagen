import {
  isLinker,
  isShape,
  type DiagramElement,
  type LinkerElement,
  type LinkerRoute,
  type ShapeElement,
} from '@diagen/core'
import { getLinkerTextBox } from '@diagen/core/text'
import { expandBounds, isPointInBounds, isPointInRotatedBounds, type Bounds, type Point } from '@diagen/shared'
import {
  getLinkerMaxTolerance,
  hitTestLinkerGeometry,
  type LinkerGeometryHit,
  type LinkerHit,
  type LinkerHitTestOptions,
} from './linkerHitTest'

export interface SceneShapeHit {
  type: 'shape'
  element: ShapeElement
}

export interface SceneLinkerHit {
  type: 'linker'
  element: LinkerElement
  hit: LinkerHit
  route: LinkerRoute
}

export type SceneHit = SceneShapeHit | SceneLinkerHit

export interface SceneHitTestOptions extends LinkerHitTestOptions {
  getLinkerLayout: (linker: LinkerElement) => { route: LinkerRoute; bounds: Bounds }
}

/**
 * 场景命中判定：
 * - 统一按 orderList 逆序扫描，保证命中顺序与视觉层级一致
 * - shape 先用基础几何做命中兜底
 * - linker 通过真实 route 做精确判定，避免仅凭 canvas bounds 抢占事件
 */
export function hitTestScene(
  elements: Array<DiagramElement | null | undefined>,
  point: Point,
  options: SceneHitTestOptions,
): SceneHit | null {
  const linkerHitPadding = getLinkerHitPadding(options)

  for (let index = elements.length - 1; index >= 0; index--) {
    const element = elements[index]
    if (!element || element.visible === false) continue

    const shapeHit = hitTestShapeElement(element, point)
    if (shapeHit) return shapeHit

    const linkerHit = hitTestLinkerElement(element, point, options, linkerHitPadding)
    if (linkerHit) return linkerHit
  }

  return null
}

function hitTestShapeElement(element: DiagramElement, point: Point): SceneShapeHit | null {
  if (!isShape(element)) return null
  if (element.attribute.visible === false) return null
  if (!isPointInRotatedBounds(point, element.props, element.props.angle ?? 0)) return null

  return {
    type: 'shape',
    element,
  }
}

function hitTestLinkerElement(
  element: DiagramElement,
  point: Point,
  options: SceneHitTestOptions,
  linkerHitPadding: number,
): SceneLinkerHit | null {
  if (!isLinker(element)) return null

  const layout = options.getLinkerLayout(element)
  const routeHit = hitTestLinkerRoute(element, layout.route, layout.bounds, point, options, linkerHitPadding)
  const textHit = hitTestLinkerText(element, layout.route, point)
  const resolvedHit = resolveLinkerSceneHit(routeHit, textHit)
  if (!resolvedHit) return null

  return createSceneLinkerHit(element, resolvedHit, layout.route)
}

/**
 * route 命中只负责几何判定：先用扩张后的 bounds 做粗过滤，再进入精确命中。
 */
function hitTestLinkerRoute(
  element: LinkerElement,
  route: LinkerRoute,
  bounds: Bounds,
  point: Point,
  options: LinkerHitTestOptions,
  linkerHitPadding: number,
): LinkerGeometryHit | null {
  const isInRouteBounds = isPointInBounds(point, expandBounds(bounds, linkerHitPadding))
  if (!isInRouteBounds) return null

  return hitTestLinkerGeometry(element, route, point, options)
}

/**
 * text 命中独立于几何命中，交由 scene 层统一裁决优先级。
 */
function hitTestLinkerText(element: LinkerElement, route: LinkerRoute, point: Point): LinkerHit | null {
  if (!element.text) return null

  const textBox = getLinkerTextBox(route, element.text, element.fontStyle, {
    curved: element.linkerType === 'curved',
    textPosition: element.textPosition,
  })
  if (!textBox || !isPointInBounds(point, textBox)) return null

  return { type: 'text' }
}

/**
 * linker 场景优先级：端点/控制点 > 文本 > 线段中点/线身。
 */
function resolveLinkerSceneHit(routeHit: LinkerGeometryHit | null, textHit: LinkerHit | null): LinkerHit | null {
  if (routeHit && isStrongRouteHit(routeHit)) return routeHit
  if (textHit) return textHit
  return routeHit
}

function isStrongRouteHit(hit: LinkerGeometryHit): boolean {
  return hit.type === 'from' || hit.type === 'to' || hit.type === 'control'
}

function createSceneLinkerHit(element: LinkerElement, hit: LinkerHit, route: LinkerRoute): SceneLinkerHit {
  return {
    type: 'linker',
    element,
    hit,
    route,
  }
}

function getLinkerHitPadding(options: LinkerHitTestOptions): number {
  return getLinkerMaxTolerance(options)
}

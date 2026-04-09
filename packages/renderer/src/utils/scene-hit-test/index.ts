import { expandBounds, isPointInBounds, isPointInRotatedBounds, type Bounds, type Point } from '@diagen/shared'
import { isLinker, isShape, type DiagramElement, type LinkerElement, type LinkerRoute, type ShapeElement } from '@diagen/core'
import { hitTestLinker, type LinkerHit, type LinkerHitTestOptions } from '../linker-hit-test'
import { getLinkerTextBox, isPointInLinkerTextBox } from '../linkerText'

const DEFAULT_ENDPOINT_TOLERANCE = 10
const DEFAULT_CONTROL_TOLERANCE = 8
const DEFAULT_SEGMENT_TOLERANCE = 8
const DEFAULT_LINE_TOLERANCE = 8

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

    if (isShape(element)) {
      if (element.attribute.visible === false) continue
      if (
        isPointInRotatedBounds(
          point,
          {
            x: element.props.x,
            y: element.props.y,
            w: element.props.w,
            h: element.props.h,
          },
          element.props.angle ?? 0,
        )
      ) {
        return {
          type: 'shape',
          element,
        }
      }
      continue
    }

    if (!isLinker(element)) continue

    const layout = options.getLinkerLayout(element)
    const textBox = getLinkerTextBox(layout.route, element.text, element.fontStyle, {
      curved: element.linkerType === 'curved',
      textPosition: element.textPosition,
    })
    const isInRouteBounds = isPointInBounds(point, expandBounds(layout.bounds, linkerHitPadding))
    const isInTextBox = textBox ? isPointInLinkerTextBox(point, textBox) : false
    if (!isInRouteBounds && !isInTextBox) continue

    const routeHit = hitTestLinker(element, layout.route, point, options)
    const shouldPreferText = !routeHit || (routeHit.type !== 'from' && routeHit.type !== 'to' && routeHit.type !== 'control')
    const hit = isInTextBox && shouldPreferText ? { type: 'text' as const } : routeHit
    if (!hit) continue

    return {
      type: 'linker',
      element,
      hit,
      route: layout.route,
    }
  }

  return null
}

function getLinkerHitPadding(options: LinkerHitTestOptions): number {
  const zoom = Math.max(options.zoom, 0.01)
  const tolerance = Math.max(
    options.endpointTolerance ?? DEFAULT_ENDPOINT_TOLERANCE,
    options.controlTolerance ?? DEFAULT_CONTROL_TOLERANCE,
    options.segmentTolerance ?? DEFAULT_SEGMENT_TOLERANCE,
    options.lineTolerance ?? DEFAULT_LINE_TOLERANCE,
  )

  return tolerance / zoom
}

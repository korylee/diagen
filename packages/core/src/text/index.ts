import { Bounds, isPointInBounds, rotatePoint, type Point } from '@diagen/shared'
import { isShape, type FontStyle, type LinkerTextPosition, type ShapeElement } from '../model'
import { evaluateExpression as resolveValue } from '../expression'
import type { LinkerRoute } from '../route/linkerRoute'
import { getRouteCenter } from '../route/geometry'

const BoxPadX = 6
const BoxPadY = 4

export interface LinkerTextBox extends Bounds {
  cx: number
  cy: number
  lines: string[]
  lineHeight: number
}

export interface ShapeTextBox extends Bounds {
  angle: number
  cx: number
  cy: number
}

export interface GetLinkerTextAnchorOptions {
  curved?: boolean
  textPosition?: LinkerTextPosition
}

export interface GetLinkerTextBoxOptions extends GetLinkerTextAnchorOptions {
  measureText?: (line: string) => number
}

export function getLinkerTextAnchor(route: LinkerRoute, options: GetLinkerTextAnchorOptions = {}): Point | null {
  const center = getRouteCenter(route, options.curved === true)
  if (!center) return null

  return {
    x: center.x + (options.textPosition?.dx ?? 0),
    y: center.y + (options.textPosition?.dy ?? 0),
  }
}

export function getLinkerTextBox(
  route: LinkerRoute,
  text: string,
  fontStyle: FontStyle | undefined,
  options: GetLinkerTextBoxOptions = {},
): LinkerTextBox | null {
  if (!text) return null

  const center = getLinkerTextAnchor(route, options)
  if (!center) return null

  const lines = text.split('\n')
  const fontSize = fontStyle?.size || 13
  const lineHeight = fontSize * (fontStyle?.lineHeight || 1.25)
  const contentWidth = Math.max(
    ...lines.map(line => options.measureText?.(line) ?? Math.max(line.length, 1) * (fontStyle?.size || 13) * 0.6),
    fontSize,
  )
  const w = contentWidth + BoxPadX * 2
  const h = Math.max(lines.length * lineHeight + BoxPadY * 2, fontSize + BoxPadY * 2)

  return {
    x: center.x - w / 2,
    y: center.y - h / 2,
    w,
    h,
    cx: center.x,
    cy: center.y,
    lines,
    lineHeight,
  }
}

export function getShapeTextBox(shape: ShapeElement): ShapeTextBox | null {
  if (!isShape(shape)) return null

  const block = shape.textBlock[0]
  if (!block) return null

  const size = { w: shape.props.w, h: shape.props.h }
  const x = resolveValue(block.position.x, size)
  const y = resolveValue(block.position.y, size)
  const w = resolveValue(block.position.w, size)
  const h = resolveValue(block.position.h, size)
  const angle = shape.props.angle ?? 0
  const shapeCenter = {
    x: shape.props.x + shape.props.w / 2,
    y: shape.props.y + shape.props.h / 2,
  }
  const center = rotatePoint(
    {
      x: shape.props.x + x + w / 2,
      y: shape.props.y + y + h / 2,
    },
    angle,
    shapeCenter,
  )

  return {
    x: shape.props.x + x,
    y: shape.props.y + y,
    w,
    h,
    angle,
    cx: center.x,
    cy: center.y,
  }
}

export function isPointInShapeTextBox(shape: ShapeElement, point: Point): boolean {
  const box = getShapeTextBox(shape)
  if (!box) return false
  if (!box.angle) {
    return isPointInBounds(point, box)
  }

  const rotatedPoint = rotatePoint(point, -box.angle, {
    x: shape.props.x + shape.props.w / 2,
    y: shape.props.y + shape.props.h / 2,
  })

  return isPointInBounds(rotatedPoint, box)
}

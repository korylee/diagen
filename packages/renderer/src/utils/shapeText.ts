import { isShape, resolvePathValue, type ShapeElement } from '@diagen/core'
import { isPointInBounds, rotatePoint, type Point } from '@diagen/shared'

export interface ShapeTextBox {
  x: number
  y: number
  w: number
  h: number
  angle: number
  cx: number
  cy: number
}

export function getShapeTextBox(shape: ShapeElement): ShapeTextBox | null {
  if (!isShape(shape)) return null

  const block = shape.textBlock[0]
  if (!block) return null

  const x = resolvePathValue(block.position.x, shape.props.w, shape.props.h)
  const y = resolvePathValue(block.position.y, shape.props.w, shape.props.h)
  const w = resolvePathValue(block.position.w, shape.props.w, shape.props.h)
  const h = resolvePathValue(block.position.h, shape.props.w, shape.props.h)
  const shapeCenter = {
    x: shape.props.x + shape.props.w / 2,
    y: shape.props.y + shape.props.h / 2,
  }
  const center = rotatePoint(
    {
      x: shape.props.x + x + w / 2,
      y: shape.props.y + y + h / 2,
    },
    shape.props.angle ?? 0,
    shapeCenter,
  )

  return {
    x: shape.props.x + x,
    y: shape.props.y + y,
    w,
    h,
    angle: shape.props.angle ?? 0,
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

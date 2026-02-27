import { Rect } from 'packages/shared'
import { DiagramElement, isLinkerConnected, isShape } from '../model'

export function getElementBounds(element: DiagramElement): Rect | null {
  if (isShape(element)) {
    const props = element.props
    return {
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
    }
  }

  if (isLinkerConnected(element)) {
    const from = element.from
    const to = element.to

    const minX = Math.min(from.x, to.x)
    const minY = Math.min(from.y, to.y)
    const maxX = Math.max(from.x, to.x)
    const maxY = Math.max(from.y, to.y)

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    }
  }

  return null
}

import type { Bounds } from '@diagen/shared'
import type { LinkerElement } from '../../../model'
import { getLinkerTextBox } from '../../../text'
import type { LinkerRoute } from '../../../route'
import { unionNormalizedBounds } from './bounds'

export function calculateLinkerBounds(linker: LinkerElement, route: LinkerRoute): Bounds {
  const routeBounds = calculateLinkerBoundsFromRoute(route)
  const textBounds = calculateLinkerTextBounds(linker, route)

  return textBounds ? unionNormalizedBounds(routeBounds, textBounds) : routeBounds
}

function calculateLinkerBoundsFromRoute(route: LinkerRoute): Bounds {
  if (route.points.length === 0) {
    return { x: 0, y: 0, w: 1, h: 1 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of route.points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX || 1,
    h: maxY - minY || 1,
  }
}

function calculateLinkerTextBounds(linker: LinkerElement, route: LinkerRoute): Bounds | null {
  const box = getLinkerTextBox(route, linker.text, linker.fontStyle, {
    curved: linker.linkerType === 'curved',
    textPosition: linker.textPosition,
  })
  if (!box) return null

  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
  }
}

import { normalizeBounds, pick, type Bounds, type Size, unionBounds } from '@diagen/shared'
import { isLinker, isShape, type DiagramElement, type LinkerElement, type ShapeElement } from '../../../model'
import type { AutoGrowConfig } from '../../types'
import type { LinkerRoute } from '../../../utils/router'

interface ContainerSizeResolverOptions {
  autoGrow: AutoGrowConfig
  content: Bounds
  current: Size
  page: Size
}

export function createPageBounds(width: number, height: number): Bounds {
  return {
    x: 0,
    y: 0,
    w: width,
    h: height,
  }
}

export function unionNormalizedBounds(a: Bounds, b: Bounds): Bounds {
  return normalizeBounds(unionBounds(normalizeBounds(a), normalizeBounds(b)))
}

export function areBoundsEqual(a: Bounds, b: Bounds): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

export function getShapeBounds(shape: ShapeElement): Bounds {
  return pick(shape.props, ['x', 'y', 'w', 'h'])
}

export function calculateLinkerBoundsFromRoute(route: LinkerRoute): Bounds {
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

export function normalizeCanvasSize(value: number): number {
  return Math.max(1, Math.floor(value))
}

export function resolveContainerSizeForContent(options: ContainerSizeResolverOptions): Size {
  const { autoGrow, content, current, page } = options
  const right = content.x + content.w
  const bottom = content.y + content.h
  const requiredWidth = Math.max(page.width, Math.ceil(right + autoGrow.growPadding))
  const requiredHeight = Math.max(page.height, Math.ceil(bottom + autoGrow.growPadding))

  return {
    width:
      requiredWidth > current.width
        ? Math.min(autoGrow.maxWidth, Math.max(current.width, ceilByStep(requiredWidth, autoGrow.growStep)))
        : current.width,
    height:
      requiredHeight > current.height
        ? Math.min(autoGrow.maxHeight, Math.max(current.height, ceilByStep(requiredHeight, autoGrow.growStep)))
        : current.height,
  }
}

function ceilByStep(value: number, step: number): number {
  if (step <= 1) return Math.ceil(value)
  return Math.ceil(value / step) * step
}

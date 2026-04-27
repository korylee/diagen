import { normalizeBounds, pick, unionBounds, type Bounds } from '@diagen/shared'
import { isLinker, isShape, type DiagramElement, type LinkerElement, type ShapeElement } from '../../../model'

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

export function getElementBounds(
  element: DiagramElement,
  options: { getLinkerBounds: (linker: LinkerElement) => Bounds },
): Bounds | null {
  if (isShape(element)) {
    return getShapeBounds(element)
  }

  if (isLinker(element)) {
    return options.getLinkerBounds(element)
  }

  return null
}

export function getElementsBounds(
  elements: Array<DiagramElement | null | undefined>,
  options: { getLinkerBounds: (linker: LinkerElement) => Bounds },
): Bounds | null {
  return elements.reduce<Bounds | null>((acc, element) => {
    const nextBounds = element ? getElementBounds(element, options) : null
    if (!nextBounds) return acc
    return acc ? unionNormalizedBounds(acc, nextBounds) : normalizeBounds(nextBounds)
  }, null)
}

export function normalizeCanvasSize(value: number): number {
  return Math.max(1, Math.floor(value))
}

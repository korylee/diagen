import { describe, expect, it } from 'vitest'
import type { Bounds, Point } from '@diagen/shared'
import {
  createLinker as createLinkerElement,
  createShape as createShapeElement,
  type LinkerElement,
  type LinkerRoute,
  type ShapeElement,
} from '@diagen/core'
import { hitTestScene } from '../'

function createRoute(points: Point[]): LinkerRoute {
  return {
    points,
    fromAngle: 0,
    toAngle: 0,
  }
}

function createBounds(points: Point[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
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

function createLinker(id: string): LinkerElement {
  return createLinkerElement({
    id,
    name: id,
  })
}

function createShape(id: string, x: number, y: number, w: number, h: number): ShapeElement {
  return createShapeElement({
    id,
    name: id,
    props: {
      x,
      y,
      w,
      h,
      angle: 0,
    },
  })
}

describe('scene-hit-test', () => {
  it('应在上层连线仅 bounds 重合但轨迹未命中时命中下层连线', () => {
    const lower = createLinker('lower')
    const upper = createLinker('upper')

    const lowerRoute = createRoute([
      { x: 0, y: 30 },
      { x: 100, y: 30 },
    ])
    const upperRoute = createRoute([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ])

    const layouts = new Map<string, { route: LinkerRoute; bounds: Bounds }>([
      [lower.id, { route: lowerRoute, bounds: createBounds(lowerRoute.points) }],
      [upper.id, { route: upperRoute, bounds: createBounds(upperRoute.points) }],
    ])

    const hit = hitTestScene(
      [lower, upper],
      { x: 20, y: 30 },
      {
        zoom: 1,
        getLinkerLayout: linker => layouts.get(linker.id)!,
      },
    )

    expect(hit?.type).toBe('linker')
    expect(hit?.element.id).toBe(lower.id)
  })

  it('应优先返回更上层的 shape，而不是其下方的连线', () => {
    const linker = createLinker('linker')
    const shape = createShape('shape', 20, 20, 80, 40)
    const route = createRoute([
      { x: 0, y: 40 },
      { x: 120, y: 40 },
    ])

    const hit = hitTestScene(
      [linker, shape],
      { x: 40, y: 40 },
      {
        zoom: 1,
        getLinkerLayout: () => ({
          route,
          bounds: createBounds(route.points),
        }),
      },
    )

    expect(hit?.type).toBe('shape')
    expect(hit?.element.id).toBe(shape.id)
  })

  it('轨迹完全重合时应优先返回更上层的连线', () => {
    const lower = createLinker('lower')
    const upper = createLinker('upper')
    const route = createRoute([
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ])

    const layouts = new Map<string, { route: LinkerRoute; bounds: Bounds }>([
      [lower.id, { route, bounds: createBounds(route.points) }],
      [upper.id, { route, bounds: createBounds(route.points) }],
    ])

    const hit = hitTestScene(
      [lower, upper],
      { x: 40, y: 50 },
      {
        zoom: 1,
        getLinkerLayout: linker => layouts.get(linker.id)!,
      },
    )

    expect(hit?.type).toBe('linker')
    expect(hit?.element.id).toBe(upper.id)
  })
})

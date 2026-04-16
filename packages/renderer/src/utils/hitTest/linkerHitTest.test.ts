import { describe, expect, it } from 'vitest'
import { createLinker, type LinkerElement, type LinkerRoute } from '@diagen/core'
import { hitTestLinkerGeometry } from './linkerHitTest'

function createFreeLinker(id: string): LinkerElement {
  return createLinker({
    id,
    name: id,
  })
}

function createRoute(points: Array<{ x: number; y: number }>): LinkerRoute {
  return {
    points,
    fromAngle: 0,
    toAngle: 0,
  }
}

describe('linker-hit-test', () => {
  it('应按端点优先级命中 from/to', () => {
    const linker = createFreeLinker('endpoints')
    const route = createRoute([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])

    const fromHit = hitTestLinkerGeometry(linker, route, { x: 0, y: 0 }, { zoom: 1 })
    const toHit = hitTestLinkerGeometry(linker, route, { x: 100, y: 0 }, { zoom: 1 })

    expect(fromHit?.type).toBe('from')
    expect(toHit?.type).toBe('to')
  })

  it('应在端点之后命中控制点', () => {
    const linker = createFreeLinker('control')
    linker.points = [{ x: 40, y: 20 }]
    const route = createRoute([
      { x: 0, y: 0 },
      { x: 40, y: 20 },
      { x: 100, y: 0 },
    ])

    const hit = hitTestLinkerGeometry(linker, route, { x: 40, y: 20 }, { zoom: 1 })

    expect(hit?.type).toBe('control')
    expect(hit?.controlIndex).toBe(0)
  })

  it('应在控制点之后命中 segment 中点', () => {
    const linker = createFreeLinker('segment')
    const route = createRoute([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])

    const hit = hitTestLinkerGeometry(linker, route, { x: 50, y: 0 }, { zoom: 1 })

    expect(hit?.type).toBe('segment')
    expect(hit?.segmentIndex).toBe(0)
    expect(hit?.point).toEqual({ x: 50, y: 0 })
  })

  it('应在中点之外命中线身', () => {
    const linker = createFreeLinker('line')
    const route = createRoute([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ])

    const hit = hitTestLinkerGeometry(linker, route, { x: 20, y: 2 }, { zoom: 1 })

    expect(hit?.type).toBe('line')
    expect(hit?.segmentIndex).toBe(0)
  })

  it('route 点数不足两点时应返回 null', () => {
    const linker = createFreeLinker('invalid')
    const route = createRoute([{ x: 0, y: 0 }])

    const hit = hitTestLinkerGeometry(linker, route, { x: 0, y: 0 }, { zoom: 1 })

    expect(hit).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { normalizeManualPoints } from './normalizeManualPoints'

describe('normalizeManualPoints', () => {
  it('应使用共享的点相等判断去重近似重复点', () => {
    const points = normalizeManualPoints(
      'broken',
      [
        { x: 50, y: 20 },
        { x: 50 + 1e-7, y: 20 + 1e-7 },
      ],
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    )

    expect(points).toEqual([{ x: 50, y: 20 }])
  })

  it('应在浮点误差范围内折叠共线控制点', () => {
    const points = normalizeManualPoints(
      'broken',
      [{ x: 50, y: 1e-9 }],
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    )

    expect(points).toEqual([])
  })

  it('orthogonal 应保留合法矩形路径的折点', () => {
    const points = normalizeManualPoints(
      'orthogonal',
      [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    )

    expect(points).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ])
  })

  it('orthogonal 应折叠局部 box detour', () => {
    const points = normalizeManualPoints(
      'orthogonal',
      [
        { x: 0, y: 50 },
        { x: 10, y: 50 },
        { x: 10, y: 60 },
        { x: 0, y: 60 },
      ],
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    )

    expect(points).toEqual([])
  })
})

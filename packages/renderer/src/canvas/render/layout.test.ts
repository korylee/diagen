import { describe, expect, it } from 'vitest'
import { fitBoundsToViewport } from './layout'

describe('fitBoundsToViewport', () => {
  it('应在预览容器内按 padding 等比缩放', () => {
    const frame = fitBoundsToViewport(
      { x: 0, y: 0, w: 100, h: 50 },
      { width: 64, height: 48, padding: 6 },
    )

    expect(frame.scale).toBeCloseTo(0.52)
    expect(frame.offsetX).toBeCloseTo(6)
    expect(frame.offsetY).toBeCloseTo(11)
  })

  it('应补偿源 bounds 偏移后再居中', () => {
    const frame = fitBoundsToViewport(
      { x: 20, y: 10, w: 40, h: 20 },
      { width: 80, height: 40, padding: 8 },
    )

    expect(frame.scale).toBeCloseTo(1.2)
    expect(frame.offsetX).toBeCloseTo(-8)
    expect(frame.offsetY).toBeCloseTo(-4)
  })
})

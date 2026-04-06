import { createLinker } from '@diagen/core'
import { describe, expect, it, vi } from 'vitest'
import { renderLinker } from './render-utils'

function createContextMock() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    closePath: vi.fn(),
    arc: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineJoin: 'miter',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    font: '',
  } as unknown as CanvasRenderingContext2D
}

function createStraightLinkerById(id: string) {
  const linker = createLinker({
    id,
    name: id,
    linkerType: 'straight',
    from: {
      id: null,
      x: 0,
      y: 0,
      binding: { type: 'free' },
    },
    to: {
      id: null,
      x: 100,
      y: 0,
      binding: { type: 'free' },
    },
  })
  linker.lineStyle.beginArrowStyle = 'none'
  linker.lineStyle.endArrowStyle = 'none'
  return linker
}

describe('renderLinker', () => {
  it('应按顺序绘制水平 line jump', () => {
    const ctx = createContextMock()
    const linker = createStraightLinkerById('render_jump_horizontal')

    renderLinker(ctx, linker, {
      points: [
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ],
      fromAngle: 0,
      toAngle: 0,
      jumps: [
        {
          segmentIndex: 0,
          center: { x: 40, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 52, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
      ],
    })

    expect(ctx.moveTo).toHaveBeenCalledWith(0, 50)
    expect(ctx.lineTo.mock.calls).toEqual([
      [36, 50],
      [48, 50],
      [100, 50],
    ])
    expect(ctx.quadraticCurveTo.mock.calls).toEqual([
      [40, 46, 44, 50],
      [52, 46, 56, 50],
    ])
  })

  it('应按顺序绘制垂直 line jump', () => {
    const ctx = createContextMock()
    const linker = createStraightLinkerById('render_jump_vertical')

    renderLinker(ctx, linker, {
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 100 },
      ],
      fromAngle: 0,
      toAngle: 0,
      jumps: [
        {
          segmentIndex: 0,
          center: { x: 50, y: 40 },
          orientation: 'vertical',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 50, y: 52 },
          orientation: 'vertical',
          radius: 4,
        },
      ],
    })

    expect(ctx.moveTo).toHaveBeenCalledWith(50, 0)
    expect(ctx.lineTo.mock.calls).toEqual([
      [50, 36],
      [50, 48],
      [50, 100],
    ])
    expect(ctx.quadraticCurveTo.mock.calls).toEqual([
      [54, 40, 50, 44],
      [54, 52, 50, 56],
    ])
  })

  it('反向水平 segment 也应保持 jump 顺序稳定', () => {
    const ctx = createContextMock()
    const linker = createStraightLinkerById('render_jump_horizontal_reverse')

    renderLinker(ctx, linker, {
      points: [
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ],
      fromAngle: 0,
      toAngle: 0,
      jumps: [
        {
          segmentIndex: 0,
          center: { x: 52, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 40, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
      ],
    })

    expect(ctx.moveTo).toHaveBeenCalledWith(100, 50)
    expect(ctx.lineTo.mock.calls).toEqual([
      [56, 50],
      [44, 50],
      [0, 50],
    ])
    expect(ctx.quadraticCurveTo.mock.calls).toEqual([
      [52, 46, 48, 50],
      [40, 46, 36, 50],
    ])
  })
})

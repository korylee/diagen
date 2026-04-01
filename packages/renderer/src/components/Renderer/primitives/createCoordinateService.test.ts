import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCoordinateService } from './createCoordinateService'

const ctx = vi.hoisted(() => ({
  rect: vi.fn(() => ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  })),
  toCanvas: vi.fn((point: { x: number; y: number }) => point),
  toScreen: vi.fn((point: { x: number; y: number }) => point),
}))

vi.mock('@diagen/primitives', () => ({
  createElementRect: vi.fn(() => ({
    rect: ctx.rect,
  })),
}))

vi.mock('../..', () => ({
  useDesigner: () => ({
    view: {
      toCanvas: ctx.toCanvas,
      toScreen: ctx.toScreen,
    },
  }),
}))

describe('createCoordinateService', () => {
  beforeEach(() => {
    ctx.rect.mockReset()
    ctx.rect.mockReturnValue({
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    })

    ctx.toCanvas.mockReset()
    ctx.toCanvas.mockImplementation((point: { x: number; y: number }) => point)

    ctx.toScreen.mockReset()
    ctx.toScreen.mockImplementation((point: { x: number; y: number }) => point)
  })

  it('存在 sceneLayer 时 eventToScreen 应基于 scene rect 计算', () => {
    const sceneLayer = {
      getBoundingClientRect: vi.fn(() => ({
        left: 100,
        top: 80,
        right: 500,
        bottom: 380,
      })),
    } as unknown as HTMLDivElement

    const coordinate = createCoordinateService({
      viewportRef: () => null,
      sceneLayerRef: () => sceneLayer,
    })

    expect(
      coordinate.eventToScreen({
        clientX: 150,
        clientY: 120,
      }),
    ).toEqual({
      x: 50,
      y: 40,
    })
    expect(sceneLayer.getBoundingClientRect).toHaveBeenCalledTimes(1)
    expect(ctx.rect).not.toHaveBeenCalled()
  })

  it('不存在 sceneLayer 时 eventToScreen 应回退到 viewport rect 与 scroll', () => {
    ctx.rect.mockReturnValue({
      left: 100,
      top: 80,
      right: 500,
      bottom: 380,
    })

    const viewport = {
      scrollLeft: 30,
      scrollTop: 20,
    } as HTMLDivElement

    const coordinate = createCoordinateService({
      viewportRef: () => viewport,
      sceneLayerRef: () => null,
    })

    expect(
      coordinate.eventToScreen({
        clientX: 150,
        clientY: 120,
      }),
    ).toEqual({
      x: 80,
      y: 60,
    })
    expect(ctx.rect).toHaveBeenCalledTimes(1)
  })

  it('viewport 不存在时 eventToScreen 应返回原点', () => {
    const coordinate = createCoordinateService({
      viewportRef: () => null,
      sceneLayerRef: () => null,
    })

    expect(
      coordinate.eventToScreen({
        clientX: 150,
        clientY: 120,
      }),
    ).toEqual({
      x: 0,
      y: 0,
    })
    expect(ctx.rect).not.toHaveBeenCalled()
  })

  it('eventToCanvas 应先转 screen 坐标再委托给 view.toCanvas', () => {
    const sceneLayer = {
      getBoundingClientRect: vi.fn(() => ({
        left: 100,
        top: 80,
        right: 500,
        bottom: 380,
      })),
    } as unknown as HTMLDivElement

    ctx.toCanvas.mockReturnValue({ x: 500, y: 600 })

    const coordinate = createCoordinateService({
      viewportRef: () => null,
      sceneLayerRef: () => sceneLayer,
    })

    expect(
      coordinate.eventToCanvas({
        clientX: 150,
        clientY: 120,
      }),
    ).toEqual({
      x: 500,
      y: 600,
    })
    expect(ctx.toCanvas).toHaveBeenCalledTimes(1)
    expect(ctx.toCanvas).toHaveBeenCalledWith({
      x: 50,
      y: 40,
    })
  })
})

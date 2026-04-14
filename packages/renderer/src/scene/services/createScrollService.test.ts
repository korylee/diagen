import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcStep, createScrollService, getEdgeDelta } from './createScrollService'

const measure = vi.fn()

vi.mock('@diagen/primitives', async importOriginal => {
  const actual = await importOriginal<typeof import('@diagen/primitives')>()

  return {
    ...actual,
    createScroll: vi.fn(() => ({
      position: {
        x: 0,
        y: 0,
      },
      measure,
    })),
  }
})

const DEFAULT_OPTIONS = {
  edgeGap: 28,
  maxStep: 26,
} as const

describe('Renderer createScrollService', () => {
  const ctx = {
    viewportRect: vi.fn(() => ({
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
    })),
    shouldAutoScroll: vi.fn(() => true),
    movePointer: vi.fn(),
  }

  function createFrameScheduler() {
    let nextId = 1
    const callbacks = new Map<number, FrameRequestCallback>()

    return {
      request: vi.fn((callback: FrameRequestCallback) => {
        const id = nextId++
        callbacks.set(id, callback)
        return id
      }),
      cancel: vi.fn((id: number) => {
        callbacks.delete(id)
      }),
      pending: () => callbacks.size,
      runNext: (time = 0) => {
        const next = callbacks.entries().next()
        if (next.done) return false

        const [id, callback] = next.value
        callbacks.delete(id)
        callback(time)
        return true
      },
    }
  }

  function createViewportState(overrides: Partial<Record<keyof HTMLElement, number>> = {}) {
    return {
      scrollLeft: 50,
      scrollTop: 60,
      scrollWidth: 1000,
      scrollHeight: 900,
      clientWidth: 400,
      clientHeight: 300,
      ...overrides,
    } as unknown as HTMLDivElement
  }

  function createController(viewport: HTMLDivElement, overrides: Partial<Record<'edgeGap' | 'maxStep', number>> = {}) {
    return createScrollService({
      viewportRef: () => viewport,
      viewportRect: ctx.viewportRect,
      pointer: {
        machine: {
          move: ctx.movePointer,
          shouldAutoScroll: ctx.shouldAutoScroll,
        },
      } as any,
      ...overrides,
    })
  }

  beforeEach(() => {
    ctx.viewportRect.mockReset()
    ctx.viewportRect.mockReturnValue({
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
    })

    ctx.shouldAutoScroll.mockReset()
    ctx.shouldAutoScroll.mockReturnValue(true)

    ctx.movePointer.mockReset()
    measure.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calcStep 应按边缘距离线性计算步进', () => {
    expect(calcStep(0, DEFAULT_OPTIONS)).toBe(DEFAULT_OPTIONS.maxStep)
    expect(calcStep(DEFAULT_OPTIONS.edgeGap, DEFAULT_OPTIONS)).toBe(0)
    expect(calcStep(14, DEFAULT_OPTIONS)).toBe(13)
  })

  it('getEdgeDelta 应在四边缘内返回对应滚动方向', () => {
    const rect = {
      left: 100,
      right: 500,
      top: 100,
      bottom: 400,
    }

    const leftTop = getEdgeDelta(
      {
        clientX: 102,
        clientY: 105,
        rect,
      },
      DEFAULT_OPTIONS,
    )
    expect(leftTop.dx).toBeLessThan(0)
    expect(leftTop.dy).toBeLessThan(0)

    const rightBottom = getEdgeDelta(
      {
        clientX: 498,
        clientY: 398,
        rect,
      },
      DEFAULT_OPTIONS,
    )
    expect(rightBottom.dx).toBeGreaterThan(0)
    expect(rightBottom.dy).toBeGreaterThan(0)
  })

  it('getEdgeDelta 在安全区域内应返回 0 位移', () => {
    const delta = getEdgeDelta(
      {
        clientX: 300,
        clientY: 220,
        rect: {
          left: 100,
          right: 500,
          top: 100,
          bottom: 400,
        },
      },
      DEFAULT_OPTIONS,
    )

    expect(delta).toEqual({ dx: 0, dy: 0 })
  })

  it('createScrollService 应在触边时立即滚动并启动续滚循环', () => {
    const viewport = createViewportState()
    const scheduler = createFrameScheduler()
    vi.stubGlobal('requestAnimationFrame', scheduler.request)
    vi.stubGlobal('cancelAnimationFrame', scheduler.cancel)

    const controller = createController(viewport)

    controller.move(
      new MouseEvent('mousemove', {
        clientX: 498,
        clientY: 220,
        buttons: 1,
      }),
    )

    expect(viewport.scrollLeft).toBe(75)
    expect(viewport.scrollTop).toBe(60)
    expect(ctx.movePointer).toHaveBeenCalledTimes(2)
    expect(measure).toHaveBeenCalledTimes(1)
    expect(scheduler.request).toHaveBeenCalledTimes(1)
    expect(scheduler.pending()).toBe(1)
  })

  it('createScrollService 应使用最后一次指针位置持续滚动直到无法继续', () => {
    const viewport = createViewportState({ scrollLeft: 550 })
    const scheduler = createFrameScheduler()
    vi.stubGlobal('requestAnimationFrame', scheduler.request)
    vi.stubGlobal('cancelAnimationFrame', scheduler.cancel)

    const controller = createController(viewport)

    controller.move(
      new MouseEvent('mousemove', {
        clientX: 498,
        clientY: 220,
        buttons: 1,
      }),
    )

    expect(viewport.scrollLeft).toBe(575)
    expect(scheduler.pending()).toBe(1)

    scheduler.runNext()
    expect(viewport.scrollLeft).toBe(600)
    expect(ctx.movePointer).toHaveBeenCalledTimes(3)
    expect(scheduler.pending()).toBe(1)

    scheduler.runNext()
    expect(viewport.scrollLeft).toBe(600)
    expect(ctx.movePointer).toHaveBeenCalledTimes(3)
    expect(scheduler.pending()).toBe(0)
  })

  it('createScrollService reset 应取消挂起循环并清空指针快照', () => {
    const viewport = createViewportState()
    const scheduler = createFrameScheduler()
    vi.stubGlobal('requestAnimationFrame', scheduler.request)
    vi.stubGlobal('cancelAnimationFrame', scheduler.cancel)

    const controller = createController(viewport)

    controller.move(
      new MouseEvent('mousemove', {
        clientX: 498,
        clientY: 220,
        buttons: 1,
      }),
    )
    controller.reset()

    expect(scheduler.cancel).toHaveBeenCalledTimes(1)
    expect(scheduler.pending()).toBe(0)

    scheduler.runNext()
    expect(viewport.scrollLeft).toBe(75)
    expect(ctx.movePointer).toHaveBeenCalledTimes(2)
  })

  it('createScrollService 应使用自定义 edgeGap 与 maxStep', () => {
    const viewport = createViewportState()
    const scheduler = createFrameScheduler()
    vi.stubGlobal('requestAnimationFrame', scheduler.request)
    vi.stubGlobal('cancelAnimationFrame', scheduler.cancel)

    const controller = createController(viewport, {
      edgeGap: 40,
      maxStep: 10,
    })

    controller.move(
      new MouseEvent('mousemove', {
        clientX: 498,
        clientY: 220,
        buttons: 1,
      }),
    )

    expect(viewport.scrollLeft).toBe(60)
    expect(ctx.movePointer).toHaveBeenCalledTimes(2)
    expect(scheduler.pending()).toBe(1)
  })

  it('syncOriginOffset 应按原点偏移增量补偿滚动位置', () => {
    const viewport = createViewportState()
    const controller = createController(viewport)

    controller.syncOriginOffset({ x: 100, y: 80 })
    controller.syncOriginOffset({ x: 130, y: 95 })

    expect(viewport.scrollLeft).toBe(80)
    expect(viewport.scrollTop).toBe(75)
    expect(measure).toHaveBeenCalledTimes(1)
  })
})

import { describe, expect, it } from 'vitest'
import { createPointerDeltaState } from './createPointerDeltaState'

describe('pointerDeltaState', () => {
  it('未提供 eventToCanvas 时应按屏幕位移和缩放计算 delta', () => {
    const state = createPointerDeltaState()

    state.begin({
      clientX: 10,
      clientY: 20,
    })

    const delta = state.resolveDelta({
      moveState: {
        dx: 30,
        dy: 18,
        shouldUpdate: true,
      },
      zoom: 2,
      event: {
        clientX: 40,
        clientY: 38,
      },
    })

    expect(delta).toEqual({
      x: 15,
      y: 9,
    })
  })

  it('提供 eventToCanvas 时应优先按画布坐标计算 delta', () => {
    const state = createPointerDeltaState({
      eventToCanvas: event => ({
        x: event.clientX / 2,
        y: event.clientY / 4,
      }),
    })

    state.begin({
      clientX: 20,
      clientY: 40,
    })

    const delta = state.resolveDelta({
      moveState: {
        dx: 100,
        dy: 100,
        shouldUpdate: true,
      },
      zoom: 10,
      event: {
        clientX: 50,
        clientY: 68,
      },
    })

    expect(delta).toEqual({
      x: 15,
      y: 7,
    })
  })

  it('reset 后应清空起点，并回退到 moveState 计算', () => {
    const state = createPointerDeltaState({
      eventToCanvas: event => ({
        x: event.clientX,
        y: event.clientY,
      }),
    })

    state.begin({
      clientX: 0,
      clientY: 0,
    })
    state.reset()

    const delta = state.resolveDelta({
      moveState: {
        dx: 12,
        dy: 8,
        shouldUpdate: true,
      },
      zoom: 4,
      event: {
        clientX: 100,
        clientY: 100,
      },
    })

    expect(delta).toEqual({
      x: 3,
      y: 2,
    })
  })
})

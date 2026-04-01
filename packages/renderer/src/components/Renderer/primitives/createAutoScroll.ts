import { createRafLoop, type ElementRect } from '@diagen/primitives'
import { CoordinateService } from './createCoordinateService'
import { CreatePointerInteraction } from '../interaction/createPointerInteraction'

interface AutoScrollOptions {
  edgeGap?: number
  maxStep?: number
}

export interface ScrollEl {
  scrollLeft: number
  scrollTop: number
  scrollWidth: number
  scrollHeight: number
  clientWidth: number
  clientHeight: number
}

export interface ScrollRect extends Pick<ElementRect, 'left' | 'top' | 'right' | 'bottom'> {}

type MouseSnap = Pick<MouseEvent, 'clientX' | 'clientY' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'buttons'>

export function calcStep(distance: number, options: Required<AutoScrollOptions>): number {
  const ratio = Math.max(0, Math.min(1, (options.edgeGap - Math.max(0, distance)) / options.edgeGap))
  return Math.ceil(ratio * options.maxStep)
}

export function getEdgeDelta(
  input: { clientX: number; clientY: number; rect: ScrollRect },
  options: Required<AutoScrollOptions>,
): {
  dx: number
  dy: number
} {
  const { clientX, clientY, rect } = input
  const { edgeGap } = options
  const left = clientX - rect.left
  const right = rect.right - clientX
  const top = clientY - rect.top
  const bottom = rect.bottom - clientY

  return {
    dx: left < edgeGap ? -calcStep(left, options) : right < edgeGap ? calcStep(right, options) : 0,
    dy: top < edgeGap ? -calcStep(top, options) : bottom < edgeGap ? calcStep(bottom, options) : 0,
  }
}

function getScrollCommit(
  node: ScrollEl,
  input: {
    dx: number
    dy: number
  },
) {
  const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = node
  const { dx, dy } = input
  const maxLeft = Math.max(0, scrollWidth - clientWidth)
  const maxTop = Math.max(0, scrollHeight - clientHeight)
  const left = Math.max(0, Math.min(maxLeft, scrollLeft + dx))
  const top = Math.max(0, Math.min(maxTop, scrollTop + dy))

  return {
    left,
    top,
    changed: left !== scrollLeft || top !== scrollTop,
  }
}

export function createAutoScroll(
  el: () => ScrollEl | null,
  interaction: {
    pointer: CreatePointerInteraction
    coordinate: CoordinateService
  },
  options: AutoScrollOptions = {},
) {
  const { coordinate, pointer } = interaction
  const { edgeGap = 28, maxStep = 26 } = options
  const rect = coordinate.viewportRect
  const move = (event: MouseEvent) => {
    pointer.machine.move(event)
  }
  const active = () => pointer.machine.shouldAutoScroll()

  let lastPointer: MouseSnap | null = null

  const applyScroll = (event: MouseEvent): boolean => {
    const viewportEl = el()
    const viewportRect = rect()
    if (!viewportEl || !viewportRect) return false

    const { dx, dy } = getEdgeDelta(
      {
        clientX: event.clientX,
        clientY: event.clientY,
        rect: viewportRect,
      },
      {
        edgeGap,
        maxStep,
      },
    )
    if (dx === 0 && dy === 0) return false

    const next = getScrollCommit(viewportEl, {
      dx,
      dy,
    })
    if (!next.changed) return false

    viewportEl.scrollLeft = next.left
    viewportEl.scrollTop = next.top
    return true
  }

  const frameLoop = createRafLoop(() => {
    if (!active() || !lastPointer) return false

    const event = { ...lastPointer } as MouseEvent
    const didScroll = applyScroll(event)
    if (!didScroll) return false

    // 滚动后使用同一指针位置重算交互，避免命中/吸附状态滞后
    move(event)
    return true
  }, {
    immediate: false,
  })

  const onPointerMove = (event: MouseEvent) => {
    lastPointer = {
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      buttons: event.buttons,
    }
    move(event)

    if (!active()) {
      frameLoop.pause()
      return
    }

    const didScroll = applyScroll(event)
    if (!didScroll) return

    // 同步一次 move，保证当前帧滚动后交互状态正确
    move(event)
    frameLoop.resume()
  }

  const reset = () => {
    frameLoop.pause()
    lastPointer = null
  }

  return {
    move: onPointerMove,
    reset,
  }
}

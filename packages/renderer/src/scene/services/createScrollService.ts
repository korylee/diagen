import { createRafLoop, createScroll, tryOnCleanup, type ElementRect } from '@diagen/primitives'
import type { Point } from '@diagen/shared'
import { createEffect, onCleanup, type Accessor } from 'solid-js'
import type { CreatePointerInteraction } from '../pointer'
import { useDesigner } from '../../context'

interface ScrollServiceOptions {
  viewportRef: Accessor<HTMLDivElement | null>
  viewportRect: Accessor<ScrollRect>
  pointer: CreatePointerInteraction
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

type AutoScrollOptions = Pick<ScrollServiceOptions, 'edgeGap' | 'maxStep'>

function getClampedScrollPosition(node: ScrollEl, input: { left: number; top: number }) {
  const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth)
  const maxTop = Math.max(0, node.scrollHeight - node.clientHeight)

  return {
    left: Math.max(0, Math.min(maxLeft, input.left)),
    top: Math.max(0, Math.min(maxTop, input.top)),
  }
}

function getRawScrollPosition(input: { left: number; top: number }) {
  return {
    left: Math.max(0, input.left),
    top: Math.max(0, input.top),
  }
}

export function createScrollService(options: ScrollServiceOptions) {
  const { emitter, view, state } = useDesigner()
  const { viewportRef, viewportRect, pointer } = options
  const { edgeGap = 28, maxStep = 26 } = options
  const viewportScroll = createScroll(viewportRef, {
    eventListenerOptions: { passive: true },
  })
  const movePointer = (event: MouseEvent) => {
    pointer.machine.move(event)
  }
  const isPointerActive = () => pointer.machine.isActive?.() ?? pointer.machine.shouldAutoScroll()
  const shouldAutoScroll = () => pointer.machine.shouldAutoScroll()

  let lastPointer: MouseSnap | null = null
  let lastOriginOffset: Point | null = null

  const commit = (input: { left: number; top: number }, options: { clamp?: boolean } = {}): boolean => {
    const viewportEl = viewportRef()
    if (!viewportEl) return false

    const next = options.clamp ? getClampedScrollPosition(viewportEl, input) : getRawScrollPosition(input)
    const changed = next.left !== viewportEl.scrollLeft || next.top !== viewportEl.scrollTop
    if (!changed) return false

    viewportEl.scrollLeft = next.left
    viewportEl.scrollTop = next.top
    // 统一在 service 内同步滚动状态，保证渲染层可见区判断只依赖这一份滚动数据
    viewportScroll.measure()
    return true
  }

  const applyScroll = (event: MouseEvent): boolean => {
    const viewportEl = viewportRef()
    const rect = viewportRect()
    if (!viewportEl || !rect) return false

    const { dx, dy } = getEdgeDelta(
      {
        clientX: event.clientX,
        clientY: event.clientY,
        rect,
      },
      {
        edgeGap,
        maxStep,
      },
    )
    if (dx === 0 && dy === 0) return false

    return commit(
      {
        left: viewportEl.scrollLeft + dx,
        top: viewportEl.scrollTop + dy,
      },
      { clamp: true },
    )
  }

  const frameLoop = createRafLoop(
    () => {
      if (!shouldAutoScroll() || !lastPointer) return false

      const event = { ...lastPointer } as MouseEvent
      const didScroll = applyScroll(event)
      if (!didScroll) return false

      // 滚动后使用同一指针位置重算交互，避免命中/吸附状态滞后
      movePointer(event)
      return true
    },
    {
      immediate: false,
    },
  )

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

    if (!isPointerActive()) {
      frameLoop.pause()
      return
    }

    movePointer(event)

    if (!shouldAutoScroll()) {
      frameLoop.pause()
      return
    }

    const didScroll = applyScroll(event)
    if (!didScroll) return

    // 同步一次 move，保证当前帧滚动后交互状态正确
    movePointer(event)
    frameLoop.resume()
  }

  const reset = () => {
    frameLoop.pause()
    lastPointer = null
  }

  const scrollTo = (left: number, top: number): boolean => {
    return commit({ left, top })
  }

  const scrollBy = (dx: number, dy: number): boolean => {
    const viewportEl = viewportRef()
    if (!viewportEl) return false

    return commit({
      left: viewportEl.scrollLeft + dx,
      top: viewportEl.scrollTop + dy,
    })
  }

  const isActive = () => !!lastPointer && (isPointerActive() || shouldAutoScroll())

  const dispose = emitter.on('view:navigated', () => {
    const inset = state.config.containerInset
    const originOffset = view.originOffset()
    const normalizedOffset = {
      x: originOffset.x,
      y: originOffset.y,
    }

    lastOriginOffset = normalizedOffset

    return scrollTo(inset + normalizedOffset.x, inset + normalizedOffset.y)
  })

  createEffect(() => {
    const offset = view.originOffset()
    const normalizedOffset = {
      x: offset.x,
      y: offset.y,
    }

    if (!viewportRef()) {
      lastOriginOffset = normalizedOffset
      return
    }

    if (!lastOriginOffset) {
      lastOriginOffset = normalizedOffset
      return
    }

    const deltaX = normalizedOffset.x - lastOriginOffset.x
    const deltaY = normalizedOffset.y - lastOriginOffset.y
    lastOriginOffset = normalizedOffset

    if (deltaX === 0 && deltaY === 0) return

    // 左/上自动扩展时同步补偿滚动位置，保证用户当前看到的画面不因原点平移而突跳
    scrollBy(deltaX, deltaY)
  })

  onCleanup(() => {
    reset()
    dispose()
  })

  return {
    position: viewportScroll.position,
    scrollTo,
    scrollBy,
    move: onPointerMove,
    reset,
    isActive,
  }
}

export type ScrollService = ReturnType<typeof createScrollService>

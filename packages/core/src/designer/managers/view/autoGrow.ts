import { createRafLoop } from '@diagen/primitives'
import type { Bounds, Size } from '@diagen/shared'
import type { AutoGrowConfig } from '../../types'

interface AutoGrowSizeInput {
  autoGrow: AutoGrowConfig
  content: Bounds
  current: Size
  page: Size
}

export interface AutoGrowResolution {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export function resolveContainerSizeForContent(options: AutoGrowSizeInput): AutoGrowResolution {
  const { autoGrow, content, current, page } = options
  const right = content.x + content.w
  const bottom = content.y + content.h
  // 左/上方向的自增不直接改内容坐标，而是先产出原点补偿量，交给 view 层后续统一消费
  const offsetX = content.x < 0 ? ceilByStep(Math.ceil(-content.x + autoGrow.growPadding), autoGrow.growStep) : 0
  const offsetY = content.y < 0 ? ceilByStep(Math.ceil(-content.y + autoGrow.growPadding), autoGrow.growStep) : 0
  // 右/下方向只有在真实越过页面边界后才追加 growPadding，避免首次触发就无条件把整页提前扩大一圈
  const requiredWidth =
    right > page.width
      ? Math.max(page.width + offsetX, Math.ceil(right + offsetX + autoGrow.growPadding))
      : page.width + offsetX
  const requiredHeight =
    bottom > page.height
      ? Math.max(page.height + offsetY, Math.ceil(bottom + offsetY + autoGrow.growPadding))
      : page.height + offsetY

  return {
    width:
      requiredWidth > current.width
        ? Math.min(autoGrow.maxWidth, Math.max(current.width, ceilByStep(requiredWidth, autoGrow.growStep)))
        : current.width,
    height:
      requiredHeight > current.height
        ? Math.min(autoGrow.maxHeight, Math.max(current.height, ceilByStep(requiredHeight, autoGrow.growStep)))
        : current.height,
    offsetX,
    offsetY,
  }
}

function ceilByStep(value: number, step: number): number {
  if (step <= 1) return Math.ceil(value)
  return Math.ceil(value / step) * step
}

export function createRafMergeQueue<T, R>(options: { merge: (prev: T, next: T) => T; run: (payload?: T) => R }) {
  let pending: T | undefined

  const mergePending = (payload?: T) => {
    if (payload == null) return
    pending = pending == null ? payload : options.merge(pending, payload)
  }

  const consumePending = () => {
    const queued = pending
    pending = undefined
    return queued
  }

  const loop = createRafLoop(
    () => {
      options.run(consumePending())
      return false
    },
    {
      immediate: false,
    },
  )

  const enqueue = (payload?: T) => {
    mergePending(payload)
    loop.resume()
  }

  const flush = (payload?: T): R => {
    mergePending(payload)
    loop.pause()
    return options.run(consumePending())
  }

  return {
    enqueue,
    flush,
  }
}

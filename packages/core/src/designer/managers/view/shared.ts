import {
  normalizeBounds,
  pick,
  unionBounds,
  type Bounds,
  type Size,
} from '@diagen/shared'
import { createRafLoop } from '@diagen/primitives'
import { type LinkerElement, type ShapeElement } from '../../../model'
import { getLinkerTextBox } from '../../../text'
import type { LinkerRoute } from '../../../route'
import type { AutoGrowConfig } from '../../types'

interface ContainerSizeResolverOptions {
  autoGrow: AutoGrowConfig
  content: Bounds
  current: Size
  page: Size
}

export interface ContainerAutoGrowResolution {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export function createPageBounds(width: number, height: number): Bounds {
  return {
    x: 0,
    y: 0,
    w: width,
    h: height,
  }
}

export function unionNormalizedBounds(a: Bounds, b: Bounds): Bounds {
  return normalizeBounds(unionBounds(normalizeBounds(a), normalizeBounds(b)))
}

export function areBoundsEqual(a: Bounds, b: Bounds): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

export function getShapeBounds(shape: ShapeElement): Bounds {
  return pick(shape.props, ['x', 'y', 'w', 'h'])
}

export function calculateLinkerBounds(linker: LinkerElement, route: LinkerRoute): Bounds {
  const routeBounds = calculateLinkerBoundsFromRoute(route)
  const textBounds = calculateLinkerTextBounds(linker, route)

  return textBounds ? unionNormalizedBounds(routeBounds, textBounds) : routeBounds
}

export function calculateLinkerBoundsFromRoute(route: LinkerRoute): Bounds {
  if (route.points.length === 0) {
    return { x: 0, y: 0, w: 1, h: 1 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of route.points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX || 1,
    h: maxY - minY || 1,
  }
}

function calculateLinkerTextBounds(linker: LinkerElement, route: LinkerRoute): Bounds | null {
  const box = getLinkerTextBox(route, linker.text, linker.fontStyle, {
    curved: linker.linkerType === 'curved',
    textPosition: linker.textPosition,
  })
  if (!box) return null

  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
  }
}

export function normalizeCanvasSize(value: number): number {
  return Math.max(1, Math.floor(value))
}

export function resolveContainerSizeForContent(options: ContainerSizeResolverOptions): ContainerAutoGrowResolution {
  const { autoGrow, content, current, page } = options
  const right = content.x + content.w
  const bottom = content.y + content.h
  // 左/上方向的自增不直接改内容坐标，而是先产出原点补偿量，交给 view 层后续统一消费
  const offsetX =
    content.x < -autoGrow.growPadding ? ceilByStep(Math.ceil(-content.x + autoGrow.growPadding), autoGrow.growStep) : 0
  const offsetY =
    content.y < -autoGrow.growPadding ? ceilByStep(Math.ceil(-content.y + autoGrow.growPadding), autoGrow.growStep) : 0
  // 右/下方向的尺寸计算需要叠加左/上补偿量，这样容器总尺寸才能真实覆盖平移后的页面与内容
  const requiredWidth = Math.max(page.width + offsetX, Math.ceil(right + offsetX + autoGrow.growPadding))
  const requiredHeight = Math.max(page.height + offsetY, Math.ceil(bottom + offsetY + autoGrow.growPadding))

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

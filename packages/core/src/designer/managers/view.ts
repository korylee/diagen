import { type Bounds, createRafMergeQueue, normalizeBounds, pick, type Point, unionBounds } from '@diagen/shared'
import { batch, createMemo, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { type DiagramElement, isLinker, isShape, type LinkerElement, type ShapeElement } from '../../model'
import { canvasToScreen, clampZoom, screenToCanvas } from '../../utils'
import { calculateLinkerRoute, type LinkerRoute } from '../../utils/router'
import type { ElementManager } from './element'
import type { DesignerContext } from './types'
import type { SelectionManager } from './selection.ts'

export interface LinkerLayout {
  route: LinkerRoute
  bounds: Bounds
}

interface LinkerLayoutCacheEntry {
  stamp: number
  layout: LinkerLayout
}

/** 视图管理器 */
export function createViewManager(
  ctx: DesignerContext,
  deps: { element: ElementManager; selection: SelectionManager },
) {
  const { state, setState, emitter } = ctx
  const { element, selection } = deps

  const viewport = createMemo(() => state.viewport)
  const viewportSize = createMemo(() => state.viewportSize)
  const containerSize = createMemo(() => state.containerSize)
  const zoom = createMemo(() => viewport().zoom)
  const diagramPage = createMemo(() => state.diagram.page)
  const [bounds, setBounds] = createSignal<Bounds>(createInitialBounds())
  const selectionBounds = createMemo((): Bounds | null => {
    const ids = selection.selectedIds()
    const els = element.getElementsByIds(ids)

    return getElementsBounds(els)
  })

  function setZoom(val: number, center?: Point): void {
    const newZoom = clampZoom(val)

    if (center) {
      const oldZoom = zoom()
      const scale = newZoom / oldZoom
      setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - viewport().x) * scale,
        y: center.y - (center.y - viewport().y) * scale,
      })
    } else {
      setState('viewport', 'zoom', newZoom)
    }
  }

  function setPan(x: number, y: number): void {
    setState('viewport', { x, y })
  }

  function pan(deltaX: number, deltaY: number): void {
    setPan(viewport().x + deltaX, viewport().y + deltaY)
  }

  /** 屏幕坐标 → 画布坐标 */
  function toCanvas<T extends Point | Bounds>(val: T) {
    return screenToCanvas(val, viewport())
  }

  /** 画布坐标 → 屏幕坐标 */
  function toScreen<T extends Point | Bounds>(val: T) {
    return canvasToScreen(val, viewport())
  }

  function centerTo(point: Point): void {
    const { width, height } = viewportSize()
    setState('viewport', {
      x: width / 2 - point.x * zoom(),
      y: height / 2 - point.y * zoom(),
    })
  }

  function fitBounds(bounds: Bounds | null): void {
    if (!bounds) return
    if (bounds.w <= 0 || bounds.h <= 0) {
      setZoom(1)
      return
    }

    const { width, height } = viewportSize()
    const zoomX = width / bounds.w
    const zoomY = height / bounds.h
    const newZoom = clampZoom(Math.min(zoomX, zoomY))

    setState('viewport', {
      zoom: newZoom,
      x: (width - bounds.w * newZoom) / 2 - bounds.x * newZoom,
      y: (height - bounds.h * newZoom) / 2 - bounds.y * newZoom,
    })
  }

  function fitToContent(): void {
    fitBounds(bounds())
  }

  function fitToSelection() {
    fitBounds(selectionBounds())
  }

  function zoomIn(): void {
    setZoom(zoom() * 1.2)
  }
  function zoomOut(): void {
    setZoom(zoom() / 1.2)
  }

  function setPageSize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.floor(width))
    const nextHeight = Math.max(1, Math.floor(height))
    batch(() => {
      setState('diagram', 'page', { width: nextWidth, height: nextHeight })
      mergeBounds({ x: 0, y: 0, w: nextWidth, h: nextHeight })
      setContainerSize(nextWidth, nextHeight)
    })
    flushAutoGrow()
  }

  function setViewportSize(width: number, height: number): void {
    setState('viewportSize', {
      width: Math.max(1, Math.floor(width)),
      height: Math.max(1, Math.floor(height)),
    })
  }

  function setContainerSize(width: number, height: number): void {
    setState('containerSize', {
      width: Math.max(1, Math.floor(width)),
      height: Math.max(1, Math.floor(height)),
    })
  }

  function getPageBounds(): Bounds {
    const { width, height } = diagramPage()
    return {
      x: 0,
      y: 0,
      w: width,
      h: height,
    }
  }

  function unionNormalized(a: Bounds, b: Bounds): Bounds {
    return normalizeBounds(unionBounds(normalizeBounds(a), normalizeBounds(b)))
  }

  function isSameBounds(a: Bounds, b: Bounds): boolean {
    return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
  }

  function mergeBounds(next: Bounds | null | undefined): Bounds {
    if (!next) return bounds()
    const current = bounds()
    const merged = unionNormalized(current, next)
    if (!isSameBounds(merged, current)) {
      setBounds(merged)
    }
    return merged
  }

  function createInitialBounds(): Bounds {
    const page = getPageBounds()
    const elementsBounds = getElementsBounds(element.elements())
    return elementsBounds ? unionNormalized(page, elementsBounds) : page
  }

  /**
   * 当前内容边界（仅扩张）
   */
  function getContentBounds(extraBounds?: Bounds): Bounds {
    return extraBounds ? unionNormalized(bounds(), extraBounds) : bounds()
  }

  function ceilByStep(value: number, step: number): number {
    if (step <= 1) return Math.ceil(value)
    return Math.ceil(value / step) * step
  }

  /**
   * 根据内容边界确保容器尺寸可覆盖内容（仅扩容，不回缩）
   */
  function ensureContainerFits(extraBounds?: Bounds): boolean {
    const autoGrow = state.config.autoGrow
    if (!autoGrow.enabled) return false

    const content = extraBounds ? mergeBounds(extraBounds) : bounds()
    const current = containerSize()
    const page = diagramPage()

    const right = content.x + content.w
    const bottom = content.y + content.h
    const requiredWidth = Math.max(page.width, Math.ceil(right + autoGrow.growPadding))
    const requiredHeight = Math.max(page.height, Math.ceil(bottom + autoGrow.growPadding))

    const nextWidth =
      requiredWidth > current.width
        ? Math.min(autoGrow.maxWidth, Math.max(current.width, ceilByStep(requiredWidth, autoGrow.growStep)))
        : current.width
    const nextHeight =
      requiredHeight > current.height
        ? Math.min(autoGrow.maxHeight, Math.max(current.height, ceilByStep(requiredHeight, autoGrow.growStep)))
        : current.height

    if (nextWidth === current.width && nextHeight === current.height) return false
    setContainerSize(nextWidth, nextHeight)
    return true
  }

  const autoGrowQueue = createRafMergeQueue<Bounds, boolean>({
    merge: unionNormalized,
    run: payload => ensureContainerFits(payload),
  })
  const linkerLayoutCache = new Map<string, LinkerLayoutCacheEntry>()
  const [linkerLayoutStampMap, setLinkerLayoutStampMap] = createStore<Record<string, number>>({})

  /**
   * 在下一帧合并执行扩容，避免拖拽过程高频 setState
   */
  function scheduleAutoGrow(extraBounds?: Bounds): void {
    if (!state.config.autoGrow.enabled) return
    autoGrowQueue.enqueue(extraBounds)
  }

  /**
   * 立即执行已排队扩容
   */
  function flushAutoGrow(extraBounds?: Bounds): boolean {
    return autoGrowQueue.flush(extraBounds)
  }

  function getLinkerLayoutStamp(id: string): number {
    return linkerLayoutStampMap[id] ?? 0
  }

  function bumpLinkerLayoutStamp(id: string): void {
    setLinkerLayoutStampMap(id, value => (value ?? 0) + 1)
  }

  function markLayoutDirty(elements: Array<DiagramElement | null | undefined>): void {
    const dirtyLinkerIds = new Set<string>()

    for (const el of elements) {
      if (!el) continue

      if (isLinker(el)) {
        dirtyLinkerIds.add(el.id)
        continue
      }

      if (isShape(el)) {
        const relatedLinkers = element.getRelatedLinkers(el.id)
        for (const linker of relatedLinkers) {
          dirtyLinkerIds.add(linker.id)
        }
      }
    }

    if (dirtyLinkerIds.size === 0) return
    batch(() => {
      for (const id of dirtyLinkerIds) {
        linkerLayoutCache.delete(id)
        bumpLinkerLayoutStamp(id)
      }
    })
  }

  function clearLayoutCache(): void {
    linkerLayoutCache.clear()
    setLinkerLayoutStampMap({})
  }

  function removeLayoutCacheEntries(elements: Array<DiagramElement | null | undefined>): void {
    for (const el of elements) {
      if (!el) continue

      if (isLinker(el)) {
        linkerLayoutCache.delete(el.id)
        setLinkerLayoutStampMap(el.id, 0)
      }
    }
  }

  const getShapeById = (id: string) => {
    const el = element.getElementById(id)
    return el && isShape(el) ? el : null
  }

  function getLinkerRoute(linker: LinkerElement): LinkerRoute {
    return getLinkerLayout(linker).route
  }

  function getShapeBounds(el: ShapeElement): Bounds {
    const props = el.props
    return pick(props, ['x', 'y', 'w', 'h'])
  }

  function getLinkerBounds(el: LinkerElement): Bounds {
    return getLinkerLayout(el).bounds
  }

  function getLinkerLayout(linker: LinkerElement): LinkerLayout {
    // 通过 linker 级 stamp 建立响应依赖，确保受影响连线可触发重算。
    const stamp = getLinkerLayoutStamp(linker.id)
    const cached = linkerLayoutCache.get(linker.id)
    if (cached && cached.stamp === stamp) {
      return cached.layout
    }

    const route = calculateLinkerRoute(linker, getShapeById, { strategy: 'basic' })
    const bounds = calculateLinkerBoundsFromRoute(route)
    const layout = { route, bounds }
    linkerLayoutCache.set(linker.id, {
      stamp,
      layout,
    })
    return layout
  }

  function calculateLinkerBoundsFromRoute(route: LinkerRoute): Bounds {
    if (route.points.length === 0) {
      return { x: 0, y: 0, w: 1, h: 1 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of route.points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 }
  }

  function getElementBounds(el: DiagramElement) {
    if (isShape(el)) {
      return getShapeBounds(el)
    }

    if (isLinker(el)) {
      return getLinkerBounds(el)
    }

    return null
  }

  function getElementsBounds(elements: Array<DiagramElement | null | undefined>) {
    return elements.reduce<Bounds | null>((acc, el) => {
      const next = el ? getElementBounds(el) : null
      if (!next) return acc
      return acc ? unionNormalized(acc, next) : normalizeBounds(next)
    }, null)
  }

  const mergeBoundsFromEvent = ({ elements }: { elements: Array<DiagramElement | null | undefined> }) =>
    mergeBounds(getElementsBounds(elements))
  const markLayoutDirtyFromEvent = ({ elements }: { elements: Array<DiagramElement | null | undefined> }) =>
    markLayoutDirty(elements)
  const clearLayoutCacheFromEvent = () => clearLayoutCache()
  const removeLayoutCacheFromEvent = ({ elements }: { elements: Array<DiagramElement | null | undefined> }) =>
    removeLayoutCacheEntries(elements)

  emitter.on('element:updated', markLayoutDirtyFromEvent)
  emitter.on('element:added', markLayoutDirtyFromEvent)
  emitter.on('element:removed', markLayoutDirtyFromEvent)
  emitter.on('element:updated', mergeBoundsFromEvent)
  emitter.on('element:added', mergeBoundsFromEvent)
  emitter.on('element:removed', removeLayoutCacheFromEvent)
  emitter.on('element:cleared', clearLayoutCacheFromEvent)

  return {
    page: diagramPage,
    viewport,
    viewportSize,
    containerSize,
    zoom,
    bounds,
    selectionBounds,

    setZoom,
    setPan,
    zoomIn,
    zoomOut,
    fitBounds,
    fitToContent,
    fitToSelection,
    pan,
    centerTo,
    toCanvas,
    toScreen,
    setPageSize,
    setViewportSize,
    setContainerSize,
    getContentBounds,
    ensureContainerFits,
    scheduleAutoGrow,
    flushAutoGrow,

    getLinkerLayout,
    getLinkerRoute,
    getLinkerBounds,
    getShapeBounds,
    getElementBounds,
    getElementsBounds,
  }
}

export type ViewManager = ReturnType<typeof createViewManager>

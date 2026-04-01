import { type Bounds, DeepPartial, normalizeBounds, type Point } from '@diagen/shared'
import { batch, createMemo, createSignal } from 'solid-js'
import { isLinker, isShape, type DiagramElement, type LinkerElement } from '../../../model'
import { canvasToScreen, clampZoom, screenToCanvas } from '../../../utils'
import type { LinkerRoute } from '../../../utils/router'
import type { ElementManager } from '../element'
import type { DesignerContext } from '../types'
import type { SelectionManager } from '../selection'
import { createLinkerLayoutController, type LinkerLayout } from './linkerLayout'
import {
  areBoundsEqual,
  createPageBounds,
  createRafMergeQueue,
  getShapeBounds,
  normalizeCanvasSize,
  resolveContainerSizeForContent,
  unionNormalizedBounds,
} from './shared'

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
  const linkerRouteConfig = createMemo(() => state.config.linkerRoute)
  const linkerLayout = createLinkerLayoutController({
    element,
    routeConfig: linkerRouteConfig,
    isLineJumpsEnabled: () => diagramPage().lineJumps,
  })
  const [bounds, setBounds] = createSignal<Bounds>(getContentBounds())
  const selectionBounds = createMemo((): Bounds | null => {
    const ids = selection.selectedIds()
    return getElementsBounds(element.getElementsByIds(ids))
  })

  function setZoom(val: number, center?: Point): void {
    const newZoom = clampZoom(val)

    if (center) {
      const currentViewport = viewport()
      const scale = newZoom / currentViewport.zoom
      setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - currentViewport.x) * scale,
        y: center.y - (center.y - currentViewport.y) * scale,
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
  function toCanvas<T extends Point | Bounds>(val: T): T extends Bounds ? Bounds : Point {
    return screenToCanvas(val, viewport())
  }

  /** 画布坐标 → 屏幕坐标 */
  function toScreen<T extends Point | Bounds>(val: T): T extends Bounds ? Bounds : Point {
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
    fitBounds(getContentBounds())
  }

  function fitToSelection(): void {
    fitBounds(selectionBounds())
  }

  function zoomIn(): void {
    setZoom(zoom() + 0.1)
  }
  function zoomOut(): void {
    setZoom(zoom() - 0.1)
  }

  function setPageSize(width: number, height: number): void {
    const nextWidth = normalizeCanvasSize(width)
    const nextHeight = normalizeCanvasSize(height)

    batch(() => {
      setState('diagram', 'page', { width: nextWidth, height: nextHeight })
      mergeBounds(createPageBounds(nextWidth, nextHeight))
      setContainerSize(nextWidth, nextHeight)
    })

    flushAutoGrow()
  }

  function setViewportSize(width: number, height: number): void {
    setState('viewportSize', {
      width: normalizeCanvasSize(width),
      height: normalizeCanvasSize(height),
    })
  }

  function setContainerSize(width: number, height: number): void {
    setState('containerSize', {
      width: normalizeCanvasSize(width),
      height: normalizeCanvasSize(height),
    })
  }

  function getPageBounds(): Bounds {
    const { width, height } = diagramPage()
    return createPageBounds(width, height)
  }

  function mergeBounds(next: Bounds | null | undefined): Bounds {
    if (!next) return bounds()

    const current = bounds()
    const merged = unionNormalizedBounds(current, next)

    if (!areBoundsEqual(merged, current)) {
      setBounds(merged)
    }

    return merged
  }

  /**
   * 当前实时内容边界
   */
  function getContentBounds(): Bounds {
    const page = getPageBounds()
    const elementsBounds = getElementsBounds(element.elements())
    return elementsBounds ? unionNormalizedBounds(page, elementsBounds) : page
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

    const nextSize = resolveContainerSizeForContent({
      autoGrow,
      content,
      current,
      page: { width: page.width, height: page.height },
    })

    if (nextSize.width === current.width && nextSize.height === current.height) return false

    setContainerSize(nextSize.width, nextSize.height)
    return true
  }

  const autoGrowQueue = createRafMergeQueue<Bounds, boolean>({
    merge: unionNormalizedBounds,
    run: payload => ensureContainerFits(payload),
  })

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

  function getLinkerRoute(linker: LinkerElement): LinkerRoute {
    return linkerLayout.getRoute(linker)
  }

  function getLinkerBounds(el: LinkerElement): Bounds {
    return linkerLayout.getBounds(el)
  }

  function getLinkerLayout(linker: LinkerElement): LinkerLayout {
    return linkerLayout.getLayout(linker)
  }

  function getElementBounds(element: DiagramElement): Bounds | null {
    if (isShape(element)) {
      return getShapeBounds(element)
    }

    if (isLinker(element)) {
      return getLinkerBounds(element)
    }

    return null
  }

  function getElementsBounds(elements: Array<DiagramElement | null | undefined>): Bounds | null {
    return elements.reduce<Bounds | null>((acc, element) => {
      const nextBounds = element ? getElementBounds(element) : null
      if (!nextBounds) return acc
      return acc ? unionNormalizedBounds(acc, nextBounds) : normalizeBounds(nextBounds)
    }, null)
  }

  function setLinkerRouteConfig(next: DeepPartial<typeof state.config.linkerRoute>): void {
    batch(() => {
      if (next.strategies) {
        setState('config', 'linkerRoute', 'strategies', current => ({ ...current, ...next.strategies }))
      }

      if (next.obstacleConfig) {
        setState('config', 'linkerRoute', 'obstacleConfig', current => ({ ...current, ...next.obstacleConfig }))
      }

      if (next.obstacleOptions) {
        setState('config', 'linkerRoute', 'obstacleOptions', current => ({ ...current, ...next.obstacleOptions }))
      }

      if (next.lineJumpRadius !== undefined) {
        setState('config', 'linkerRoute', 'lineJumpRadius', next.lineJumpRadius)
      }
    })
  }

  ;(['element:updated', 'element:added', 'element:removed'] as const).forEach(event => {
    emitter.on(event, ({ elements }) => linkerLayout.markDirty(elements))
  })
  ;(['element:updated', 'element:added'] as const).forEach(event => {
    emitter.on(event, ({ elements }) => mergeBounds(getElementsBounds(elements)))
  })
  emitter.on('element:removed', ({ elements }) => linkerLayout.removeEntries(elements))
  emitter.on('element:cleared', () => linkerLayout.clear())

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
    linkerRouteConfig,
    setLinkerRouteConfig,

    getLinkerLayout,
    getLinkerRoute,
    getLinkerBounds,
    getShapeBounds,
    getElementBounds,
    getElementsBounds,
  }
}

export type ViewManager = ReturnType<typeof createViewManager>
export type { LinkerLayout } from './linkerLayout'

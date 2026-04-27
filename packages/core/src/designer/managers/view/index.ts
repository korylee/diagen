import { type Bounds, DeepPartial, type Point } from '@diagen/shared'
import { batch, createMemo, createSignal } from 'solid-js'
import type { DiagramElement, DiagramPage, LinkerElement } from '../../../model'
import { canvasToScreen, screenToCanvas, type Transform } from '../../../transform'
import type { LinkerRoute } from '../../../route'
import type { ElementManager } from '../element'
import type { DesignerContext } from '../types'
import type { SelectionManager } from '../selection'
import { createRafMergeQueue, resolveContainerSizeForContent } from './autoGrow'
import {
  areBoundsEqual,
  createPageBounds,
  getElementBounds as resolveElementBounds,
  getElementsBounds as resolveElementsBounds,
  getShapeBounds,
  normalizeCanvasSize,
  unionNormalizedBounds,
} from './bounds'
import { createLinkerLayoutController, type LinkerLayout } from './linkerLayout'
import { createViewNavigation } from './navigation'

/** 视图管理器 */
export function createViewManager(
  ctx: DesignerContext,
  deps: { element: ElementManager; selection: SelectionManager },
) {
  const { state, setState, emitter } = ctx
  const { element, selection } = deps

  const transform = createMemo(() => state.transform)
  const viewportSize = createMemo(() => state.viewportSize)
  const worldSize = createMemo(() => state.worldSize)
  const originOffset = createMemo(() => state.originOffset)
  const zoom = createMemo(() => transform().zoom)
  const diagramPage = createMemo(() => state.diagram.page)
  const linkerRouteConfig = createMemo(() => state.config.linkerRoute)
  const linkerLayout = createLinkerLayoutController({
    element,
    routeConfig: linkerRouteConfig,
    isLineJumpsEnabled: () => diagramPage().lineJumps,
  })
  const [bounds, setBounds] = createSignal<Bounds>(getContentBounds())
  let isAutoGrowFlushScheduled = false
  const selectionBounds = createMemo((): Bounds | null => {
    const ids = selection.selectedIds()
    return getElementsBounds(element.getElementsByIds(ids))
  })

  /** 屏幕坐标 → 画布坐标 */
  function toCanvas<T extends Point | Bounds>(val: T): T extends Bounds ? Bounds : Point {
    return screenToCanvas(val, transform(), originOffset())
  }

  /** 画布坐标 → 屏幕坐标 */
  function toScreen<T extends Point | Bounds>(val: T): T extends Bounds ? Bounds : Point {
    return canvasToScreen(val, transform(), originOffset())
  }

  function patchDiagramPage(patch: Partial<DiagramPage>): void {
    setState('diagram', current => {
      // 当前仍是单页模型，页面配置直接挂在 diagram.page 上。
      return {
        ...current,
        page: {
          ...current.page,
          ...patch,
        },
      }
    })
  }

  function setPageSize(width: number, height: number): void {
    const nextWidth = normalizeCanvasSize(width)
    const nextHeight = normalizeCanvasSize(height)

    batch(() => {
      patchDiagramPage({ width: nextWidth, height: nextHeight })
      mergeBounds(createPageBounds(nextWidth, nextHeight))
      setWorldSize(nextWidth, nextHeight)
    })

    flushAutoGrow()
  }

  function setViewportSize(width: number, height: number): void {
    setState('viewportSize', {
      width: normalizeCanvasSize(width),
      height: normalizeCanvasSize(height),
    })
  }

  function setWorldSize(width: number, height: number): void {
    setState('worldSize', {
      width: normalizeCanvasSize(width),
      height: normalizeCanvasSize(height),
    })
  }

  function setOriginOffset(offset: Point): void {
    // 统一由 view 层维护运行时原点偏移，避免后续左/上扩展时多处直接改状态
    setState('originOffset', {
      x: offset.x,
      y: offset.y,
    })
  }

  function setTransform(next: Partial<Transform> | Transform): void {
    setState('transform', next)
  }

  const navigation = createViewNavigation({
    transform,
    viewportSize,
    originOffset,
    selectionBounds,
    getContentBounds,
    setTransform,
    onNavigated: () => {
      emitter.emit('view:navigated')
    },
  })

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
    const current = worldSize()
    const currentOffset = originOffset()
    const page = diagramPage()

    const nextGrowth = resolveContainerSizeForContent({
      autoGrow,
      content,
      current,
      page: { width: page.width, height: page.height },
    })
    const nextOffset = {
      // auto-grow 只扩不缩，左/上补偿量同样保持单向增长，避免拖拽回退时画布原点抖动
      x: Math.max(currentOffset.x, nextGrowth.offsetX),
      y: Math.max(currentOffset.y, nextGrowth.offsetY),
    }
    const sizeChanged = nextGrowth.width !== current.width || nextGrowth.height !== current.height
    const offsetChanged = nextOffset.x !== currentOffset.x || nextOffset.y !== currentOffset.y

    if (!sizeChanged && !offsetChanged) return false

    batch(() => {
      if (sizeChanged) {
        setWorldSize(nextGrowth.width, nextGrowth.height)
      }
      if (offsetChanged) {
        // 统一在 view 层提交原点补偿，后续渲染层与交互层只读取这一份运行时状态
        setOriginOffset(nextOffset)
      }
    })

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
    autoGrowQueue.enqueue(extraBounds)
  }

  /**
   * 立即执行已排队扩容
   */
  function flushAutoGrow(extraBounds?: Bounds): boolean {
    return autoGrowQueue.flush(extraBounds)
  }

  function scheduleFlushAutoGrow(): void {
    if (isAutoGrowFlushScheduled) return
    isAutoGrowFlushScheduled = true

    queueMicrotask(() => {
      isAutoGrowFlushScheduled = false
      flushAutoGrow()
    })
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
    return resolveElementBounds(element, {
      getLinkerBounds,
    })
  }

  function getElementsBounds(elements: Array<DiagramElement | null | undefined>): Bounds | null {
    return resolveElementsBounds(elements, {
      getLinkerBounds,
    })
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

  ;(['element:updated', 'element:added'] as const).forEach(event => {
    emitter.on(event, ({ elements }) => {
      linkerLayout.markDirty(elements)
      const nextBounds = getElementsBounds(elements)
      mergeBounds(nextBounds)

      scheduleAutoGrow(nextBounds ?? undefined)
    })
  })
  emitter.on('element:removed', ({ elements }) => {
    // 删除 shape 后，相关连线（含 obstacle 路由）也需要失效重算。
    linkerLayout.markDirty(elements)
    linkerLayout.removeEntries(elements)
  })
  emitter.on('element:cleared', () => linkerLayout.clear())
  emitter.on('history:committed', () => scheduleFlushAutoGrow())
  emitter.on('history:redo', () => scheduleFlushAutoGrow())
  emitter.on('history:undo', () => scheduleFlushAutoGrow())

  return {
    page: diagramPage,
    transform,
    viewportSize,
    worldSize,
    originOffset,
    zoom,
    bounds,
    selectionBounds,

    setZoom: navigation.setZoom,
    setPan: navigation.setPan,
    zoomIn: navigation.zoomIn,
    zoomOut: navigation.zoomOut,
    fitBounds: navigation.fitBounds,
    fitToContent: navigation.fitToContent,
    fitToSelection: navigation.fitToSelection,
    pan: navigation.pan,
    centerTo: navigation.centerTo,
    toCanvas,
    toScreen,
    setPageSize,
    setViewportSize,
    setWorldSize,
    setOriginOffset,
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
export interface ViewEvents {
  'view:navigated': void
}
export type { LinkerLayout } from './linkerLayout'

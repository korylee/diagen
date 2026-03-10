import { createMemo, createSignal, JSX, onMount, Show } from 'solid-js'
import { createEventListener, createKeyboard, createScroll } from '@diagen/primitives'
import { createPointerInteraction } from '../primitives'
import { DesignerGrids } from './DesignerGrids'
import { useDesigner } from './DesignerProvider'
import { LinkerSelectionOverlay, SelectionBox, SelectionLayer } from './InteractionOverlay'
import { InteractionProvider } from './InteractionProvider'

const EDGE_AUTO_SCROLL_GAP = 28
const EDGE_AUTO_SCROLL_MAX_STEP = 26

export function RendererContainer(props: {
  children: JSX.Element
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
}) {
  const { selection, edit, view, state, history } = useDesigner()

  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null)
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null)
  const [sceneLayerRef, setSceneLayerRef] = createSignal<HTMLDivElement | null>(null)
  const pointer = createPointerInteraction({
    getViewport: () => view.viewport(),
    getViewportElement: viewportRef,
    getSceneLayerElement: sceneLayerRef,
    panButton: 1,
    shapeDragThreshold: 3,
    linkerDragThreshold: 3,
    resizeMinWidth: 20,
    resizeMinHeight: 20,
    boxSelectMinSize: 5,
  })
  const keyboard = createKeyboard()
  const scroll = createScroll(viewportRef)

  keyboard.bind('delete', () => edit.remove(selection.selectedIds()))
  keyboard.bind('ctrl+a', () => selection.selectAll())
  keyboard.bind('escape', () => {
    pointer.machine.cancel()
  })
  keyboard.bind('ctrl+z', () => {
    history.undo()
  })
  keyboard.bind('ctrl+y', () => {
    history.redo()
  })

  const interaction = {
    pointer,
    keyboard,
    scroll,
  }

  const containerStyle = createMemo(() => {
    const { diagram, containerSize } = state
    return {
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      padding: `${diagram.page.margin}px`,
      overflow: 'hidden',
      position: 'relative',
      'background-color': `var(--dg-page-background)`,
      'box-sizing': 'content-box',
      cursor:
        pointer.pan.isPanning() || pointer.shapeDrag.isDragging() || pointer.linkerDrag.isDragging()
          ? 'grabbing'
          : 'default',
    } as const
  })
  const layerStyle = createMemo(() => {
    const { containerSize } = state
    const { viewport } = view

    return {
      position: 'relative' as const,
      background: `var(--dg-page-background)`,
      overflow: 'visible',
      'box-shadow': `var(--dg-page-shadow)`,
      'z-index': 0,
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      transform: `translate3d(${viewport().x}px, ${viewport().y}px, 0) scale(${viewport().zoom})`,
      'transform-origin': '0 0',
    }
  })
  const sceneLayerStyle = createMemo(() => {
    const { containerSize, diagram } = state
    return {
      position: 'absolute' as const,
      left: `${diagram.page.margin}px`,
      top: `${diagram.page.margin}px`,
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      overflow: 'visible',
      'z-index': 1,
    }
  })
  const overlayLayerStyle = createMemo(() => {
    const { containerSize, diagram } = state
    return {
      position: 'absolute' as const,
      left: `${diagram.page.margin}px`,
      top: `${diagram.page.margin}px`,
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      overflow: 'visible',
      'z-index': 2,
      'pointer-events': 'none',
    } as const
  })
  const boxSelectionScreenBounds = createMemo(() => {
    const b = pointer.boxSelect.bounds()
    return b ? pointer.coordinate.canvasToScreen(b) : null
  })

  const onMouseDown = (e: MouseEvent) => {
    // 平移检测
    if (pointer.machine.startPan(e)) {
      e.preventDefault()
      return
    }
    if (!pointer.machine.isIdle()) return

    // 左键 - 框选
    if (e.button === 0) {
      selection.clear()
      pointer.machine.startBoxSelect(e)
    }
  }

  const calcEdgeStep = (distanceToEdge: number): number => {
    const distance = Math.max(0, distanceToEdge)
    const ratio = Math.max(0, Math.min(1, (EDGE_AUTO_SCROLL_GAP - distance) / EDGE_AUTO_SCROLL_GAP))
    return Math.ceil(ratio * EDGE_AUTO_SCROLL_MAX_STEP)
  }

  const autoScrollOnEdge = (e: MouseEvent) => {
    const el = viewportRef()
    if (!el) return

    const rect = pointer.coordinate.getViewportRect()
    if (!rect) return
    const leftDistance = e.clientX - rect.left
    const rightDistance = rect.right - e.clientX
    const topDistance = e.clientY - rect.top
    const bottomDistance = rect.bottom - e.clientY

    let dx = 0
    let dy = 0

    if (leftDistance < EDGE_AUTO_SCROLL_GAP) {
      dx = -calcEdgeStep(leftDistance)
    } else if (rightDistance < EDGE_AUTO_SCROLL_GAP) {
      dx = calcEdgeStep(rightDistance)
    }

    if (topDistance < EDGE_AUTO_SCROLL_GAP) {
      dy = -calcEdgeStep(topDistance)
    } else if (bottomDistance < EDGE_AUTO_SCROLL_GAP) {
      dy = calcEdgeStep(bottomDistance)
    }

    if (dx === 0 && dy === 0) return

    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    const maxTop = Math.max(0, el.scrollHeight - el.clientHeight)
    const nextLeft = Math.max(0, Math.min(maxLeft, el.scrollLeft + dx))
    const nextTop = Math.max(0, Math.min(maxTop, el.scrollTop + dy))

    if (nextLeft === el.scrollLeft && nextTop === el.scrollTop) return
    el.scrollLeft = nextLeft
    el.scrollTop = nextTop
  }

  const onMouseMove = (e: MouseEvent) => {
    pointer.machine.move(e)
    if (pointer.machine.shouldAutoScroll()) {
      autoScrollOnEdge(e)
    }
  }
  const onMouseUp = () => {
    pointer.machine.end()
  }

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, view.viewport().zoom + delta))
      view.setZoom(newZoom, pointer.coordinate.eventToCanvas(e))
    }
  }

  createEventListener(containerRef, 'wheel', onWheel, { passive: false })
  createEventListener(
    () => window,
    'mousemove',
    e => {
      onMouseMove(e)
    },
  )
  createEventListener(
    () => window,
    'mouseup',
    () => {
      onMouseUp()
    },
  )

  const measureViewport = () => {
    const el = viewportRef()
    if (!el) return
    view.setViewportSize(el.clientWidth, el.clientHeight)
  }

  createEventListener(viewportRef, 'scroll', () => {
    measureViewport()
  })
  createEventListener(
    () => window,
    'resize',
    () => {
      measureViewport()
    },
  )

  onMount(() => {
    measureViewport()
    const { padding, margin } = state.diagram.page
    const val = margin - padding
    scroll.scrollTo(val, val)
  })

  return (
    <InteractionProvider interaction={interaction}>
      <div
        ref={setViewportRef}
        class="designer-viewport"
        style="overflow: scroll;position: relative;z-index: 0;background: #eaecee;height: 900px;"
      >
        {/*滚动容器*/}
        <div
          ref={setContainerRef}
          style={containerStyle()}
          onMouseDown={onMouseDown}
          class="designer-container"
        >
          {/*世界层（canvas 坐标，交给 transform 处理）*/}
          <div style={layerStyle()} class="designer-layer">
            <DesignerGrids />
          </div>

          {/*渲染层（屏幕坐标，不做 transform）*/}
          <div ref={setSceneLayerRef} style={sceneLayerStyle()}>{props.children}</div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div style={overlayLayerStyle()}>
            <SelectionBox />
            <LinkerSelectionOverlay />

            {/* 框选层 - 用于显示框选区域 */}
            <Show when={pointer.boxSelect.isSelecting() && boxSelectionScreenBounds()}>
              {bounds => <SelectionLayer screenBounds={bounds()} />}
            </Show>
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

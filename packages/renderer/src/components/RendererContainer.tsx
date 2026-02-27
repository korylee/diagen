import { SelectionBox, SelectionLayer } from './InteractionOverlay'
import { useDesigner } from './DesignerProvider'
import { createDrag, createKeyboard, createPan, createResize, createSelection } from '../primitives'
import { Point } from '@diagen/shared'
import { createMemo, createSignal, JSX, onMount, Show } from 'solid-js'
import { InteractionProvider } from './InteractionProvider'
import { createEventListener, createScroll } from '@diagen/primitives'
import { DesignerGrids } from './DesignerGrids'

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
  const [layerRef, setLayerRef] = createSignal<HTMLDivElement | null>(null)
  const drag = createDrag({ threshold: 3 })
  const pan = createPan({ button: 1 })
  const resize = createResize({ minWidth: 20, minHeight: 20 })
  const boxSelect = createSelection({ minSize: 5 })
  const keyboard = createKeyboard()
  const scroll = createScroll(viewportRef)

  keyboard.bind('delete', () => edit.remove(selection.selectedIds()))
  keyboard.bind('ctrl+a', () => selection.selectAll())
  keyboard.bind('escape', () => {
    if (drag.isDragging() || drag.isPending()) drag.cancel()
    if (pan.isPanning()) pan.end()
    if (resize.isResizing()) resize.cancel()
    if (boxSelect.isSelecting()) boxSelect.cancel()
  })
  keyboard.bind('ctrl+z', () => {
    history.undo()
  })
  keyboard.bind('ctrl+y', () => {
    history.redo()
  })

  const interaction = {
    drag,
    resize,
    pan,
    boxSelect,
    keyboard,
    scroll,
  }

  const containerStyle = createMemo(() => {
    const { diagram } = state
    return {
      width: `${diagram.page.width}px`,
      height: `${diagram.page.height}px`,
      padding: `${diagram.page.margin}px`,
      overflow: 'hidden',
      position: 'relative',
      'background-color': `var(--dg-page-background)`,
      'box-sizing': 'content-box',
      cursor: pan.isPanning() || drag.isDragging() ? 'grabbing' : 'default',
    } as const
  })
  const layerStyle = createMemo(() => {
    const {
      diagram: { page },
    } = state
    const { viewport } = view

    return {
      position: 'relative' as const,
      background: `var(--dg-page-background)`,
      overflow: 'visible',
      'box-shadow': `var(--dg-page-shadow)`,
      'z-index': 0,
      width: `${page.width}px`,
      height: `${page.height}px`,
      transform: `translate3d(${viewport().x}px, ${viewport().y}px, 0) scale(${viewport().zoom})`,
      'transform-origin': '0 0',
    }
  })

  /** 屏幕坐标 → 画布坐标 */
  const toCanvas = (e: MouseEvent): Point => {
    const layerRect = layerRef()?.getBoundingClientRect()
    if (!layerRect) return { x: 0, y: 0 }

    // 1. 相对于 layerRef 左上角的坐标（transform 后）
    const layerX = e.clientX - layerRect.left
    const layerY = e.clientY - layerRect.top
    // 2. 逆变换：除以 zoom 得到画布坐标
    return view.toCanvas({ x: layerX, y: layerY })
  }

  const onMouseDown = (e: MouseEvent) => {
    // 平移检测
    if (pan.canPan(e)) {
      pan.start(e)
      e.preventDefault()
      return
    }

    // 左键 - 框选
    if (e.button === 0) {
      selection.clear()
      boxSelect.start(toCanvas(e))
    }
  }
  const onMouseMove = (e: MouseEvent) => {
    if (resize.isResizing()) {
      resize.move(e)
    } else if (pan.isPanning()) {
      pan.move(e)
    } else if (drag.isDragging() || drag.isPending()) {
      drag.move(e)
    } else if (boxSelect.isSelecting()) {
      boxSelect.move(toCanvas(e))
    }
  }
  const onMouseUp = () => {
    if (resize.isResizing()) resize.end()
    else if (pan.isPanning()) pan.end()
    else if (drag.isDragging() || drag.isPending()) drag.end()
    else if (boxSelect.isSelecting()) boxSelect.end()
  }

  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, view.viewport().zoom + delta))
      view.setZoom(newZoom, toCanvas(e))
    }
  }

  createEventListener(containerRef, 'wheel', onWheel, { passive: false })

  onMount(() => {
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
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          class="designer-container"
        >
          {/*绘制层*/}
          <div ref={setLayerRef} style={layerStyle()} class="designer-layer">
            <DesignerGrids />

            {props.children}

            {/*选中框 resize手柄 rotate手柄 等交互*/}
            <SelectionBox />

            {/* 框选层 - 用于显示框选区域 */}
            <Show when={boxSelect.isSelecting() && boxSelect.rect()}>{rect => <SelectionLayer rect={rect()} />}</Show>
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

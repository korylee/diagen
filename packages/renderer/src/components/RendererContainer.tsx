import { batch, createEffect, createMemo, createSignal, JSX, onMount } from 'solid-js'
import { Schema } from '@diagen/core'
import { createEventListener, createKeyboard, createScroll } from '@diagen/primitives'
import { createPointerInteraction } from '../primitives'
import { DesignerGrids } from './DesignerGrids'
import { useDesigner } from './DesignerProvider'
import { SelectionLayer, SelectionOverlay } from './InteractionOverlay'
import { InteractionProvider } from './InteractionProvider'
import { createCoordinateService } from '../primitives/createCoordinateService'

const EDGE_AUTO_SCROLL_GAP = 28
const EDGE_AUTO_SCROLL_MAX_STEP = 26

export function RendererContainer(props: {
  children: JSX.Element
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
  /** shape 拖拽吸附容差（画布坐标） */
  shapeGuideTolerance?: number
  /** resize 吸附容差（画布坐标） */
  resizeGuideTolerance?: number
}) {
  const { selection, edit, view, state, history, tool } = useDesigner()

  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null)
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null)
  const [sceneLayerRef, setSceneLayerRef] = createSignal<HTMLDivElement | null>(null)
  const coordinate = createCoordinateService({
    viewportRef,
    sceneLayerRef,
  })
  const pointer = createPointerInteraction({
    coordinate,
    panButton: 1,
    shapeDragThreshold: 3,
    shapeGuideTolerance: props.shapeGuideTolerance,
    linkerDragThreshold: 3,
    resizeMinWidth: 20,
    resizeMinHeight: 20,
    resizeGuideTolerance: props.resizeGuideTolerance,
    boxSelectMinSize: 5,
  })
  const keyboard = createKeyboard()
  const scroll = createScroll(viewportRef)

  keyboard.bind('delete', () => edit.remove(selection.selectedIds()))
  keyboard.bind('ctrl+a', () => selection.selectAll())
  keyboard.bind('escape', () => {
    if (pointer.machine.isActive()) {
      pointer.machine.cancel()
    }
    if (!tool.isIdle()) {
      tool.setIdle()
    }
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
    coordinate
  }

  const containerStyle = createMemo(() => {
    const { containerSize, config } = state
    return {
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      padding: `${config.containerInset}px`,
      overflow: 'hidden',
      position: 'relative',
      'background-color': `var(--dg-page-background)`,
      'box-sizing': 'content-box',
      cursor:
        pointer.pan.isPanning() ||
        pointer.shapeDrag.isDragging() ||
        pointer.linkerDrag.isDragging() ||
        pointer.rotate.isRotating()
          ? 'grabbing'
          : state.tool.type === 'create-shape' || state.tool.type === 'create-linker'
            ? 'crosshair'
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
    const { containerSize, config } = state
    return {
      position: 'absolute' as const,
      left: `${config.containerInset}px`,
      top: `${config.containerInset}px`,
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      overflow: 'visible',
      'z-index': 1,
    }
  })
  const overlayLayerStyle = createMemo(() => {
    return {
      ...sceneLayerStyle(),
      'z-index': 2,
      'pointer-events': 'none',
    } as const
  })

  const onMouseDown = (e: MouseEvent) => {
    // 平移检测
    if (pointer.machine.startPan(e)) {
      e.preventDefault()
      return
    }
    if (!pointer.machine.isIdle()) return

    if (e.button === 0) {
      if (state.tool.type === 'create-shape') {
        if (startShapeCreate(e)) {
          e.preventDefault()
          return
        }
      }

      if (state.tool.type === 'create-linker') {
        if (startLinkerCreate(e)) {
          e.preventDefault()
          return
        }
      }
    }

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

    const rect = coordinate.viewportRect()
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
      view.setZoom(newZoom, coordinate.eventToCanvas(e))
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

  createEffect(() => {
    const { width, height } = coordinate.viewportRect()
    view.setViewportSize(width, height)
  })

  onMount(() => {
    const val = Math.max(0, state.config.containerInset - 10)
    scroll.scrollTo(val, val)
  })

  const startShapeCreate = (e: MouseEvent): boolean => {
    const currentTool = state.tool
    if (currentTool.type !== 'create-shape') return false

    const definition = Schema.getShape(currentTool.shapeId)
    if (!definition) return false

    const point = coordinate.eventToCanvas(e)
    const width = definition.props.w
    const height = definition.props.h
    const shape = Schema.createShape(currentTool.shapeId, {
      x: Math.round(point.x - width / 2),
      y: Math.round(point.y - height / 2),
      w: width,
      h: height,
      angle: 0,
    })
    if (!shape) return false

    batch(() => {
      edit.add([shape])
      selection.replace([shape.id])
      view.scheduleAutoGrow(view.getShapeBounds(shape))
      view.flushAutoGrow()
      if (!currentTool.continuous) {
        tool.setIdle()
      }
    })

    return true
  }

  const startLinkerCreate = (e: MouseEvent): boolean => {
    const currentTool = state.tool
    if (currentTool.type !== 'create-linker') return false

    const started = pointer.machine.startCreateLinkerFromPoint(e, {
      linkerId: currentTool.linkerId,
      point: coordinate.eventToCanvas(e),
    })
    if (started && !currentTool.continuous) {
      tool.setIdle()
    }
    return started
  }

  return (
    <InteractionProvider interaction={interaction}>
      <div
        ref={setViewportRef}
        class="designer-viewport"
        style="overflow: scroll;position: relative;z-index: 0;background: #eaecee;height: 900px;"
      >
        {/*滚动容器*/}
        <div ref={setContainerRef} style={containerStyle()} onMouseDown={onMouseDown} class="designer-container">
          {/*世界层（canvas 坐标，交给 transform 处理）*/}
          <div style={layerStyle()} class="designer-layer">
            <DesignerGrids />
          </div>

          {/*渲染层（屏幕坐标，不做 transform）*/}
          <div ref={setSceneLayerRef} style={sceneLayerStyle()}>
            {props.children}
          </div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div style={overlayLayerStyle()}>
            <SelectionOverlay />

            {/* 框选层 - 用于显示框选区域 */}
            <SelectionLayer />
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

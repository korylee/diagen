import { createEffect, createMemo, createSignal, JSX, onMount } from 'solid-js'
import { Schema } from '@diagen/core'
import { createEventListener, createKeyboard, createScroll } from '@diagen/primitives'
import type { Point } from '@diagen/shared'
import { createPointerInteraction } from '../primitives'
import { hitTestScene } from '../utils'
import { DesignerGrids } from './DesignerGrids'
import { useDesigner } from './DesignerProvider'
import { InteractionOverlay } from './InteractionOverlay'
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
  const designer = useDesigner()
  const { selection, edit, view, state, history, tool } = designer

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
  type SceneHit = ReturnType<typeof hitTestScene>
  type LinkerSceneHit = Extract<NonNullable<SceneHit>, { type: 'linker' }>

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
    coordinate,
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
    }
  }

  const applySelection = (id: string, event: MouseEvent): void => {
    if (event.ctrlKey || event.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
    } else {
      selection.replace([id])
    }
  }

  const handleCreateShapeDown = (e: MouseEvent, shapeId: string, continuous: boolean, point: Point): boolean => {
    const definition = Schema.getShape(shapeId)
    if (!definition) return false

    const width = definition.props.w
    const height = definition.props.h
    const shape = Schema.createShape(shapeId, {
      x: Math.round(point.x - width / 2),
      y: Math.round(point.y - height / 2),
      w: width,
      h: height,
      angle: 0,
    })
    if (!shape) return false

    e.stopPropagation()
    e.preventDefault()

    edit.add([shape])
    selection.replace([shape.id])
    view.scheduleAutoGrow(view.getShapeBounds(shape))
    view.flushAutoGrow()

    if (!continuous) {
      tool.setIdle()
    }

    return true
  }

  const handleCreateLinkerDown = (
    e: MouseEvent,
    point: Point,
    linkerId: string,
    continuous: boolean,
    sceneHit: SceneHit,
  ): boolean => {
    e.stopPropagation()
    e.preventDefault()

    const started =
      sceneHit?.type === 'shape'
        ? pointer.machine.startQuickCreateLinker(e, {
            sourceShapeId: sceneHit.element.id,
            linkerId,
          })
        : pointer.machine.startCreateLinkerFromPoint(e, {
            linkerId,
            point,
          })

    if (started && !continuous) {
      tool.setIdle()
    }

    return started
  }

  const handleLinkerPrimaryDown = (e: MouseEvent, point: Point, sceneHit: LinkerSceneHit): boolean => {
    e.stopPropagation()
    e.preventDefault()
    applySelection(sceneHit.element.id, e)
    return pointer.machine.startLinkerDrag(e, sceneHit.element.id, point, sceneHit.hit, sceneHit.route)
  }

  const handleShapePrimaryDown = (e: MouseEvent, point: Point, shapeId: string): boolean => {
    e.stopPropagation()
    e.preventDefault()

    const resizeHit = pointer.resize.hitTest(point)
    if (resizeHit) {
      return pointer.machine.startResize(resizeHit.id, resizeHit.dir, e)
    }

    applySelection(shapeId, e)
    return pointer.machine.startShapeDrag(e)
  }

  const handleBlankPrimaryDown = (e: MouseEvent): boolean => {
    e.stopPropagation()
    e.preventDefault()
    selection.clear()
    pointer.machine.startBoxSelect(e)
    return true
  }

  const handleSceneMouseDown = (e: MouseEvent): boolean => {
    if (e.button !== 0) return false
    if (!pointer.machine.isIdle()) return false

    const currentTool = tool.tool()
    const point = coordinate.eventToCanvas(e)

    if (currentTool.type === 'create-shape') {
      return handleCreateShapeDown(e, currentTool.shapeId, currentTool.continuous, point)
    }

    const sceneHit = hitTestScene(designer.element.elements(), point, {
      zoom: view.viewport().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })

    if (currentTool.type === 'create-linker') {
      return handleCreateLinkerDown(e, point, currentTool.linkerId, currentTool.continuous, sceneHit)
    }

    if (sceneHit?.type === 'linker') {
      return handleLinkerPrimaryDown(e, point, sceneHit)
    }

    if (sceneHit?.type === 'shape') {
      return handleShapePrimaryDown(e, point, sceneHit.element.id)
    }

    return handleBlankPrimaryDown(e)
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
    const el = viewportRef()
    if (!el) return
    el.scrollLeft = val
    el.scrollTop = val
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
          style={containerStyle()}
          class="designer-container"
          onMouseDown={onMouseDown}
          on:wheel={{ passive: false, handleEvent: onWheel }}
        >
          {/*世界层（canvas 坐标，交给 transform 处理）*/}
          <div style={layerStyle()} class="designer-layer">
            <DesignerGrids />
          </div>

          {/*渲染层（屏幕坐标，不做 transform）*/}
          <div
            ref={setSceneLayerRef}
            style={sceneLayerStyle()}
            on:mousedown={e => {
              handleSceneMouseDown(e)
            }}
          >
            {props.children}
          </div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div style={overlayLayerStyle()}>
            <InteractionOverlay />
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

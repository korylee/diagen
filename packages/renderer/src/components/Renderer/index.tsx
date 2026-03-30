import { DesignerToolState, Schema } from '@diagen/core'
import { createEventListener, createKeyboard, createScroll } from '@diagen/primitives'
import { createDgBem, type Point } from '@diagen/shared'
import { createEffect, createMemo, createSignal, JSX, onMount } from 'solid-js'
import { CanvasRenderer } from '../../canvas'
import { createCoordinateService } from '../../primitives/createCoordinateService'
import { createPointerInteraction } from '../../primitives/createPointerInteraction'
import { hitTestScene, type SceneHit, type SceneLinkerHit } from '../../utils'
import { DesignerGrids } from '../DesignerGrids'
import { useDesigner } from '../DesignerProvider'
import { InteractionOverlay } from '../InteractionOverlay'
import { InteractionProvider } from '../InteractionProvider'

import './index.scss'
import { isServer } from 'solid-js/web'

const EDGE_AUTO_SCROLL_GAP = 28
const EDGE_AUTO_SCROLL_MAX_STEP = 26

function getCursor(params: { isGrabbing: boolean; toolType: DesignerToolState['type'] }) {
  const { isGrabbing, toolType } = params
  if (isGrabbing) return 'grabbing'

  if (toolType === 'create-shape' || toolType === 'create-linker') {
    return 'crosshair'
  }

  return 'default'
}

function resolveScenePrimaryIntent(params: { tool: DesignerToolState; point: Point; sceneHit: SceneHit | null }) {
  const { tool, point, sceneHit } = params

  if (tool.type === 'create-shape') {
    return {
      type: 'create-shape',
      point,
      shapeId: tool.shapeId,
      continuous: tool.continuous,
    } as const
  }

  if (tool.type === 'create-linker') {
    return {
      type: 'create-linker',
      point,
      linkerId: tool.linkerId,
      continuous: tool.continuous,
      sceneHit,
    } as const
  }

  if (sceneHit?.type === 'linker') {
    return {
      type: 'edit-linker',
      point,
      sceneHit,
    } as const
  }

  if (sceneHit?.type === 'shape') {
    return {
      type: 'interact-shape',
      point,
      shapeId: sceneHit.element.id,
    } as const
  }

  return { type: 'blank' } as const
}

type ScenePrimaryIntent = ReturnType<typeof resolveScenePrimaryIntent>

const bem = createDgBem('renderer')

export function Renderer(props: {
  children?: JSX.Element
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
  /** shape 拖拽吸附容差（画布坐标） */
  shapeGuideTolerance?: number
  /** resize 吸附容差（画布坐标） */
  resizeGuideTolerance?: number
}) {
  const { element, selection, edit, view, state, history, tool, clipboard } = useDesigner()

  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null)
  const [sceneRef, setSceneRef] = createSignal<HTMLDivElement | null>(null)
  const coordinate = createCoordinateService({
    viewportRef,
    sceneLayerRef: sceneRef,
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
  keyboard.bind('mod+a', () => selection.selectAll())
  keyboard.bind('escape', () => {
    if (pointer.machine.isActive()) {
      pointer.machine.cancel()
    }
    if (!tool.isIdle()) {
      tool.setIdle()
    }
  })
  keyboard.bind('mod+z', () => {
    history.undo()
  })
  keyboard.bind(['mod+y', 'mod+shift+z'], () => {
    history.redo()
  })
  keyboard.bind('mod+c', () => {
    clipboard.copy(selection.selectedIds())
  })
  keyboard.bind('mod+v', () => {
    clipboard.paste()
  })
  keyboard.bind('mod+x', () => {
    clipboard.cut(selection.selectedIds())
  })
  keyboard.bind('mod+d', () => {
    clipboard.duplicate(selection.selectedIds())
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
      cursor: getCursor({
        isGrabbing: pointer.machine.shouldShowGrabbingCursor(),
        toolType: state.tool.type,
      }),
    } as const
  })
  const canvasStyle = createMemo(() => {
    const { containerSize } = state
    const { viewport } = view

    return {
      position: 'relative' as const,
      overflow: 'visible',
      background: `var(--dg-page-background)`,
      'box-shadow': `var(--dg-page-shadow)`,
      'z-index': 0,
      width: `${containerSize.width}px`,
      height: `${containerSize.height}px`,
      transform: `translate3d(${viewport().x}px, ${viewport().y}px, 0) scale(${viewport().zoom})`,
      'transform-origin': '0 0',
    }
  })
  const sceneStyle = createMemo(() => {
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
  const overlayStyle = createMemo(() => {
    return {
      ...sceneStyle(),
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

  const handleCreateShapeDown = (
    e: MouseEvent,
    intent: Extract<ScenePrimaryIntent, { type: 'create-shape' }>,
  ): boolean => {
    const { shapeId, continuous, point } = intent
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
    intent: Extract<ScenePrimaryIntent, { type: 'create-linker' }>,
  ): boolean => {
    const { point, linkerId, continuous, sceneHit } = intent
    e.stopPropagation()
    e.preventDefault()

    const started =
      sceneHit?.type === 'shape'
        ? pointer.machine.beginLinkerCreate(e, {
            linkerId,
            from: {
              type: 'shape',
              shapeId: sceneHit.element.id,
            },
          })
        : pointer.machine.beginLinkerCreate(e, {
            linkerId,
            from: {
              type: 'point',
              point,
            },
          })

    if (started && !continuous) {
      tool.setIdle()
    }

    return started
  }

  const handleLinkerPrimaryDown = (
    e: MouseEvent,
    intent: Extract<ScenePrimaryIntent, { type: 'edit-linker' }>,
  ): boolean => {
    const { point, sceneHit } = intent
    e.stopPropagation()
    e.preventDefault()
    applySelection(sceneHit.element.id, e)
    return pointer.machine.beginLinkerEdit(e, {
      linkerId: sceneHit.element.id,
      point,
      hit: sceneHit.hit,
      route: sceneHit.route,
    })
  }

  const handleShapePrimaryDown = (
    e: MouseEvent,
    intent: Extract<ScenePrimaryIntent, { type: 'interact-shape' }>,
  ): boolean => {
    const { point, shapeId } = intent
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
    return pointer.machine.startBoxSelect(e)
  }

  const getSceneHit = (point: Point): SceneHit | null =>
    hitTestScene(element.elements(), point, {
      zoom: view.viewport().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })

  const PrimaryDownMap = {
    'create-shape': handleCreateShapeDown,
    'create-linker': handleCreateLinkerDown,
    'edit-linker': handleLinkerPrimaryDown,
    'interact-shape': handleShapePrimaryDown,
    blank: handleBlankPrimaryDown,
  } as const

  const handleSceneMouseDown = (e: MouseEvent): boolean => {
    if (e.button !== 0) return false
    if (!pointer.machine.isIdle()) return false

    const currentTool = tool.toolState()
    const point = coordinate.eventToCanvas(e)
    const sceneHit = currentTool.type === 'create-shape' ? null : getSceneHit(point)
    const intent = resolveScenePrimaryIntent({
      tool: currentTool,
      point,
      sceneHit,
    })

    const handle = PrimaryDownMap[intent.type]
    if (!handle) return false
    return handle(e, intent as any)
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

  if (!isServer) {
    createEventListener(window, 'mousemove', e => {
      onMouseMove(e)
    })
    createEventListener(window, 'mouseup', () => {
      onMouseUp()
    })
  }

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
      <div ref={setViewportRef} class={bem('viewport')}>
        {/*滚动容器*/}
        <div
          style={containerStyle()}
          class={bem('container')}
          onMouseDown={onMouseDown}
          on:wheel={{ passive: false, handleEvent: onWheel }}
        >
          {/*世界层（canvas 坐标，交给 transform 处理）*/}
          <div style={canvasStyle()} class={bem('canvas')}>
            <DesignerGrids />
          </div>

          {/*渲染层（屏幕坐标，不做 transform）*/}
          <div
            ref={setSceneRef}
            class={bem('scene')}
            style={sceneStyle()}
            on:mousedown={e => {
              handleSceneMouseDown(e)
            }}
          >
            <CanvasRenderer />
          </div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div class={bem('overlay')} style={overlayStyle()}>
            <InteractionOverlay />

            {props.children}
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

import { DesignerToolState, Schema } from '@diagen/core'
import { useEventListener, useKeyboard } from '@diagen/primitives'
import { createDgBem, type Point } from '@diagen/shared'
import { createEffect, createMemo, createSignal, JSX, Show } from 'solid-js'
import { isServer } from 'solid-js/web'
import { CanvasRenderer } from '../canvas'
import { InteractionProvider } from '../context'
import { useDesigner } from '../context/DesignerProvider'
import { resolveRendererDefaults, type RendererDefaultsOverrides } from '../defaults'
import { hitTestScene, type SceneHit } from '../utils'
import { createTextEditorControl, TextEditorOverlay } from './controls/textEditor'
import { BoxSelectionOverlay } from './overlays/BoxSelectionOverlay'
import { ContainerPreviewOverlay } from './overlays/ContainerPreviewOverlay'
import { GuideOverlay } from './overlays/GuideOverlay'
import { LinkerOverlay } from './overlays/LinkerOverlay'
import { ShapeSelectionOverlay } from './overlays/ShapeSelectionOverlay'
import { DesignerGrids } from './parts/DesignerGrids'
import { createPointerInteraction } from './pointer'
import { createCoordinateService } from './services/createCoordinateService'
import { createRendererHover } from './services/createRendererHover'
import { createScrollService } from './services/createScrollService'

import './Renderer.scss'

function getCursor(params: { isGrabbing: boolean; toolType: DesignerToolState['type']; hoverCursor: string | null }) {
  const { isGrabbing, toolType, hoverCursor } = params
  if (isGrabbing) return 'grabbing'

  if (toolType === 'create-shape' || toolType === 'create-linker') {
    return 'crosshair'
  }

  if (hoverCursor) return hoverCursor

  return 'default'
}

const bem = createDgBem('renderer')

function getSceneIntent(params: { tool: DesignerToolState; point: Point; sceneHit: SceneHit | null }) {
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

type SceneIntent = ReturnType<typeof getSceneIntent>

export interface RendererContextMenuRequest {
  event: MouseEvent
  clientPosition: Point
  canvasPosition: Point
  targetType: 'canvas' | 'shape' | 'linker' | 'selection'
  targetId: string | null
  selectionIds: string[]
}

export function Renderer(props: {
  world?: JSX.Element
  overlay?: JSX.Element
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
  /** renderer 默认配置覆写 */
  defaults?: RendererDefaultsOverrides
  /** 右键菜单上下文请求 */
  onContextMenu?: (request: RendererContextMenuRequest) => void
}) {
  const { selection, edit, view, state, history, tool, clipboard, element, emitter } = useDesigner()
  const rendererDefaults = resolveRendererDefaults(props.defaults)
  const interactionDefaults = rendererDefaults.interaction
  const zoomDefaults = rendererDefaults.zoom

  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null)
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null)
  const [sceneRef, setSceneRef] = createSignal<HTMLDivElement | null>(null)
  const coordinate = createCoordinateService({
    viewportRef,
    sceneLayerRef: sceneRef,
    screenToCanvas: view.toCanvas,
    canvasToScreen: view.toScreen,
  })
  const pointer = createPointerInteraction(coordinate, interactionDefaults)
  const keyboard = useKeyboard()

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

  const scroll = createScrollService({
    viewportRef,
    viewportRect: coordinate.viewportRect,
    pointer,
  })

  const interaction = {
    pointer,
    keyboard,
    coordinate,
    scroll,
  }
  const textEditor = createTextEditorControl(interaction)

  const hitScene = (point: Point): SceneHit | null =>
    hitTestScene(element.elements(), point, {
      zoom: view.transform().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })
  const hover = createRendererHover({
    getContainerEl: containerRef,
    isPointerActive: pointer.machine.isActive,
    isTextEditing: textEditor.isEditing,
    isToolIdle: tool.isIdle,
    hitTest: pointerSnapshot =>
      hitScene(
        coordinate.eventToCanvas({
          clientX: pointerSnapshot.clientX,
          clientY: pointerSnapshot.clientY,
        }),
      ),
  })
  const selectByEvent = (id: string, event: MouseEvent): void => {
    if (event.ctrlKey || event.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
      return
    }

    selection.replace([id])
  }
  const onCreateShapeDown = (event: MouseEvent, intent: Extract<SceneIntent, { type: 'create-shape' }>): boolean => {
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

    event.stopPropagation()
    event.preventDefault()

    edit.add([shape])
    selection.replace([shape.id])

    if (!continuous) {
      tool.setIdle()
    }

    return true
  }
  const onCreateLinkerDown = (event: MouseEvent, intent: Extract<SceneIntent, { type: 'create-linker' }>): boolean => {
    const { point, linkerId, continuous, sceneHit } = intent
    event.stopPropagation()
    event.preventDefault()

    const started = pointer.machine.beginLinkerCreate(event, {
      linkerId,
      from:
        sceneHit?.type === 'shape'
          ? {
              type: 'shape',
              shapeId: sceneHit.element.id,
            }
          : {
              type: 'point',
              point,
            },
    })

    if (started && !continuous) {
      tool.setIdle()
    }

    return started
  }
  const onLinkerDown = (event: MouseEvent, intent: Extract<SceneIntent, { type: 'edit-linker' }>): boolean => {
    const { point, sceneHit } = intent
    event.stopPropagation()
    event.preventDefault()
    selectByEvent(sceneHit.element.id, event)
    return pointer.machine.beginLinkerEdit(event, {
      linkerId: sceneHit.element.id,
      point,
      hit: sceneHit.hit,
      route: sceneHit.route,
    })
  }
  const onShapeDown = (event: MouseEvent, intent: Extract<SceneIntent, { type: 'interact-shape' }>): boolean => {
    const { point, shapeId } = intent
    event.stopPropagation()
    event.preventDefault()

    const resizeHit = pointer.resize.hitTest(point)
    if (resizeHit) {
      return pointer.machine.startResize(resizeHit.id, resizeHit.dir, event)
    }

    const shouldKeepSelection =
      !event.ctrlKey && !event.metaKey && selection.hasMultiple() && selection.isSelected(shapeId)

    if (!shouldKeepSelection) {
      selectByEvent(shapeId, event)
    }
    return pointer.machine.startShapeDrag(event)
  }
  const onBlankDown = (event: MouseEvent): boolean => {
    event.stopPropagation()
    event.preventDefault()
    selection.clear()
    return pointer.machine.startBoxSelect(event)
  }
  const sceneMouseDownMap = {
    'create-shape': onCreateShapeDown,
    'create-linker': onCreateLinkerDown,
    'edit-linker': onLinkerDown,
    'interact-shape': onShapeDown,
    blank: onBlankDown,
  } as const
  const onSceneMouseDown = (event: MouseEvent): boolean => {
    if (textEditor.onMouseDown(event)) return false

    if (event.button !== 0) return false
    if (!pointer.machine.isIdle()) return false

    const currentTool = tool.toolState()
    const point = coordinate.eventToCanvas(event)
    const sceneHit = currentTool.type === 'create-shape' ? null : hitScene(point)
    const intent = getSceneIntent({
      tool: currentTool,
      point,
      sceneHit,
    })

    const down = sceneMouseDownMap[intent.type]
    if (!down) return false
    return down(event, intent as never)
  }
  const sceneContextMenu = (event: MouseEvent): void => {
    if (!props.onContextMenu) return

    event.preventDefault()

    if (!pointer.machine.isIdle()) {
      return
    }

    const canvasPosition = coordinate.eventToCanvas(event)
    const sceneHit = hitScene(canvasPosition)
    const currentSelectionIds = selection.selectedIds()
    let targetType: 'canvas' | 'shape' | 'linker' | 'selection' = 'canvas'
    let targetId: string | null = null
    let selectionIds = currentSelectionIds

    if (sceneHit) {
      const hitId = sceneHit.element.id
      const isSelected = selection.isSelected(hitId)

      // 右键上下文保持和常见编辑器一致：
      // 如果命中了未选中元素，先对齐选中态，再构建菜单语义。
      if (!isSelected) {
        selection.replace([hitId])
        selectionIds = [hitId]
      }

      targetId = hitId
      targetType = isSelected && selectionIds.length > 1 ? 'selection' : sceneHit.type
    }

    props.onContextMenu({
      event,
      clientPosition: {
        x: event.clientX,
        y: event.clientY,
      },
      canvasPosition,
      targetType,
      targetId,
      selectionIds,
    })
  }
  const onContextMenu = (event: MouseEvent) => {
    if (textEditor.onContextMenu(event)) return
    sceneContextMenu(event)
  }

  const containerStyle = createMemo(() => {
    const { worldSize, config } = state
    return {
      width: `${worldSize.width}px`,
      height: `${worldSize.height}px`,
      padding: `${config.containerInset}px`,
      overflow: 'hidden',
      position: 'relative',
      'background-color': `var(--dg-page-background)`,
      'box-sizing': 'content-box',
      cursor: getCursor({
        isGrabbing: pointer.machine.showGrabbingCursor(),
        toolType: state.tool.type,
        hoverCursor: hover.cursor(),
      }),
    } as const
  })
  const worldStyle = createMemo(() => {
    const { worldSize } = state
    const { transform } = view

    return {
      position: 'relative' as const,
      overflow: 'visible',
      background: `var(--dg-page-background)`,
      'box-shadow': `var(--dg-page-shadow)`,
      'z-index': 0,
      width: `${worldSize.width}px`,
      height: `${worldSize.height}px`,
      transform: `translate3d(${transform().x}px, ${transform().y}px, 0) scale(${transform().zoom})`,
      'transform-origin': '0 0',
    }
  })
  const sceneStyle = createMemo(() => {
    const { worldSize, config } = state
    return {
      position: 'absolute' as const,
      left: `${config.containerInset}px`,
      top: `${config.containerInset}px`,
      width: `${worldSize.width}px`,
      height: `${worldSize.height}px`,
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

  const onMouseDown = (event: MouseEvent) => {
    if (textEditor.onMouseDown(event)) return
    // 平移检测
    if (pointer.machine.startPan(event)) {
      event.preventDefault()
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    scroll.move(event)
  }
  const onMouseUp = () => {
    scroll.reset()
    pointer.machine.end()
  }

  const onWheel = (event: WheelEvent) => {
    if (textEditor.isEditing()) return
    if (event.ctrlKey) {
      event.preventDefault()
      const delta = event.deltaY > 0 ? -zoomDefaults.step : zoomDefaults.step
      const newZoom = Math.max(zoomDefaults.min, Math.min(zoomDefaults.max, view.transform().zoom + delta))
      view.setZoom(newZoom, coordinate.eventToCanvas(event))
    }
  }

  if (!isServer) {
    useEventListener(window, 'mousemove', e => {
      onMouseMove(e)
    })
    useEventListener(window, 'mouseup', () => {
      onMouseUp()
    })
  }

  createEffect(() => {
    const { width, height } = coordinate.viewportRect()
    view.setViewportSize(width, height)
  })

  return (
    <InteractionProvider interaction={interaction}>
      <div ref={setViewportRef} class={bem('viewport')}>
        {/*滚动容器*/}
        <div
          ref={setContainerRef}
          style={containerStyle()}
          class={bem('container')}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
          on:wheel={{ passive: false, handleEvent: onWheel }}
        >
          {/*世界层（世界 坐标，交给 transform 处理）*/}
          <div style={worldStyle()} class={bem('world')}>
            <DesignerGrids />
            {props.world}
          </div>

          {/*渲染层（屏幕坐标，不做 transform）*/}
          <div
            ref={setSceneRef}
            class={bem('scene')}
            style={sceneStyle()}
            onMouseMove={hover.move}
            onMouseLeave={hover.leave}
            on:mousedown={onSceneMouseDown}
            onDblClick={textEditor.onDoubleClick}
          >
            <CanvasRenderer />
          </div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div class={bem('overlay')} style={overlayStyle()}>
            <Show when={!textEditor.isEditing()}>
              <BoxSelectionOverlay />
              <GuideOverlay />
              <ContainerPreviewOverlay />
              <LinkerOverlay />
              <ShapeSelectionOverlay />
            </Show>

            <Show when={textEditor.session()}>
              <TextEditorOverlay
                session={textEditor.session}
                draft={textEditor.draft}
                setDraft={textEditor.setDraft}
                commit={textEditor.commit}
                cancel={textEditor.cancel}
              />
            </Show>

            {props.overlay}
          </div>
        </div>
      </div>
    </InteractionProvider>
  )
}

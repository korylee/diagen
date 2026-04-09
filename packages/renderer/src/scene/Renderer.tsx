import { DesignerToolState } from '@diagen/core'
import { createEventListener, createKeyboard } from '@diagen/primitives'
import { createDgBem, type Point } from '@diagen/shared'
import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount, Show } from 'solid-js'
import { isServer } from 'solid-js/web'
import { hitTestScene } from '../utils'
import { CanvasRenderer } from '../canvas'
import { InteractionProvider } from '../context'
import { useDesigner } from '../context/DesignerProvider'
import { TextEditorOverlay } from './controls/textEditor'
import { createSceneContextMenu } from './events/createSceneContextMenu'
import { createSceneMouseDown } from './events/createSceneMouseDown'
import { createTextEditorControl } from './controls/textEditor'
import { createPointerInteraction } from './pointer'
import { BoxSelectionOverlay } from './overlays/BoxSelectionOverlay'
import { GuideOverlay } from './overlays/GuideOverlay'
import { LinkerOverlay } from './overlays/LinkerOverlay'
import { ShapeSelectionOverlay } from './overlays/ShapeSelectionOverlay'
import { DesignerGrids } from './parts/DesignerGrids'
import { createAutoScroll } from './services/createAutoScroll'
import { createCoordinateService } from './services/createCoordinateService'
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
  /** shape 拖拽吸附容差（画布坐标） */
  shapeGuideTolerance?: number
  /** resize 吸附容差（画布坐标） */
  resizeGuideTolerance?: number
  /** 右键菜单上下文请求 */
  onContextMenu?: (request: RendererContextMenuRequest) => void
}) {
  const { selection, edit, view, state, history, tool, clipboard, element } = useDesigner()

  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | null>(null)
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(null)
  const [sceneRef, setSceneRef] = createSignal<HTMLDivElement | null>(null)
  const [hoverCursor, setHoverCursor] = createSignal<string | null>(null)
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
    coordinate,
  }
  const textEditor = createTextEditorControl({ interaction })

  const autoScroll = createAutoScroll(viewportRef, interaction)
  const onSceneMouseDown = createSceneMouseDown(interaction)
  const sceneContextMenu = createSceneContextMenu({
    interaction,
    onRequest: props.onContextMenu,
  })
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
        isGrabbing: pointer.machine.shouldShowGrabbingCursor(),
        toolType: state.tool.type,
        hoverCursor: hoverCursor(),
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

  const onMouseDown = (e: MouseEvent) => {
    if (textEditor.onMouseDown(e)) return
    // 平移检测
    if (pointer.machine.startPan(e)) {
      e.preventDefault()
    }
  }

  const onMouseMove = (e: MouseEvent) => {
    autoScroll.move(e)
  }
  const onMouseUp = () => {
    autoScroll.reset()
    pointer.machine.end()
  }

  const onWheel = (e: WheelEvent) => {
    if (textEditor.isEditing()) return
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.1, Math.min(5, view.transform().zoom + delta))
      view.setZoom(newZoom, coordinate.eventToCanvas(e))
    }
  }

  const updateHoverCursor = (event: MouseEvent) => {
    if (pointer.machine.isActive() || textEditor.isEditing() || !tool.isIdle()) {
      setHoverCursor(null)
      return
    }

    const container = containerRef()
    if (!container) {
      setHoverCursor(null)
      return
    }

    const target = event.target
    if (!(target instanceof Node) || !container.contains(target)) {
      setHoverCursor(null)
      return
    }

    const sceneHit = hitTestScene(element.elements(), coordinate.eventToCanvas(event), {
      zoom: view.transform().zoom,
      getLinkerLayout: linker => view.getLinkerLayout(linker),
    })

    setHoverCursor(sceneHit?.type === 'linker' && sceneHit.hit.type === 'text' ? 'move' : null)
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
    const el = viewportRef()
    if (!el) return
    const transform = view.transform()
    const containerInset = state.config.containerInset
    const padding = 10
    const initialScroll = {
      // 初始滚动位置需要把运行时原点补偿一并算上，避免未来恢复态时出现首帧错位
      left: Math.max(0, Math.round(containerInset + transform.x + state.originOffset.x - padding)),
      top: Math.max(0, Math.round(containerInset + transform.y + state.originOffset.y - padding)),
    }

    el.scrollLeft = initialScroll.left
    el.scrollTop = initialScroll.top
  })

  let lastOriginOffset: Point | null = null
  createEffect(() => {
    const el = viewportRef()
    const nextOffset = { ...view.originOffset() }

    if (!el) {
      lastOriginOffset = nextOffset
      return
    }

    if (!lastOriginOffset) {
      lastOriginOffset = nextOffset
      return
    }

    const deltaX = nextOffset.x - lastOriginOffset.x
    const deltaY = nextOffset.y - lastOriginOffset.y
    if (deltaX === 0 && deltaY === 0) return

    // 左/上自动扩展时同步补偿滚动位置，保证用户当前看到的画面不因原点平移而突跳
    el.scrollLeft = Math.max(0, el.scrollLeft + deltaX)
    el.scrollTop = Math.max(0, el.scrollTop + deltaY)
    lastOriginOffset = { x: nextOffset.x, y: nextOffset.y }
  })

  onCleanup(() => {
    autoScroll.reset()
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
            onMouseMove={updateHoverCursor}
            onMouseLeave={() => {
              setHoverCursor(null)
            }}
            on:mousedown={e => {
              if (textEditor.onMouseDown(e)) return
              onSceneMouseDown(e)
            }}
            onDblClick={textEditor.onDoubleClick}
          >
            <CanvasRenderer />
          </div>

          {/*交互覆盖层（屏幕坐标，不做 transform）*/}
          <div class="dg-renderer__overlay" style={overlayStyle()}>
            <Show when={!textEditor.isEditing()}>
              <BoxSelectionOverlay />
              <GuideOverlay />
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

import { DesignerToolState } from '@diagen/core'
import { createEventListener, createKeyboard } from '@diagen/primitives'
import { createDgBem, type Point } from '@diagen/shared'
import { createEffect, createMemo, createSignal, JSX, onCleanup, onMount } from 'solid-js'
import { CanvasRenderer } from '../../canvas'
import { DesignerGrids } from '../DesignerGrids'
import { useDesigner } from '../DesignerProvider'
import { InteractionOverlay } from '../InteractionOverlay'
import { InteractionProvider } from '../InteractionProvider'
import { createSceneContextMenu } from './handlers/sceneContextMenu'
import { createSceneDown } from './handlers/sceneMouseDown'
import { createPointerInteraction } from './interaction/createPointerInteraction'
import { createAutoScroll } from './primitives/createAutoScroll'
import { createCoordinateService } from './primitives/createCoordinateService'

import { isServer } from 'solid-js/web'
import './index.scss'

function getCursor(params: { isGrabbing: boolean; toolType: DesignerToolState['type'] }) {
  const { isGrabbing, toolType } = params
  if (isGrabbing) return 'grabbing'

  if (toolType === 'create-shape' || toolType === 'create-linker') {
    return 'crosshair'
  }

  return 'default'
}

const bem = createDgBem('renderer')

export type RendererContextMenuTargetType = 'canvas' | 'shape' | 'linker' | 'selection'

export interface RendererContextMenuRequest {
  event: MouseEvent
  clientPosition: Point
  canvasPosition: Point
  targetType: RendererContextMenuTargetType
  targetId: string | null
  selectionIds: string[]
}

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
  /** 右键菜单上下文请求 */
  onContextMenu?: (request: RendererContextMenuRequest) => void
}) {
  const { selection, edit, view, state, history, tool, clipboard } = useDesigner()

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

  const autoScroll = createAutoScroll(viewportRef, interaction)
  const onSceneDown = createSceneDown(interaction)
  const onContextMenu = createSceneContextMenu({
    interaction,
    onRequest: props.onContextMenu,
  })

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

  const onMouseMove = (e: MouseEvent) => {
    autoScroll.move(e)
  }
  const onMouseUp = () => {
    autoScroll.reset()
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
    const el = viewportRef()
    if (!el) return
    const viewport = view.viewport()
    const containerInset = state.config.containerInset
    const padding = 10
    const initialScroll = {
      left: Math.max(0, Math.round(containerInset + viewport.x - padding)),
      top: Math.max(0, Math.round(containerInset + viewport.y - padding)),
    }

    el.scrollLeft = initialScroll.left
    el.scrollTop = initialScroll.top
  })

  onCleanup(() => {
    autoScroll.reset()
  })

  return (
    <InteractionProvider interaction={interaction}>
      <div ref={setViewportRef} class={bem('viewport')}>
        {/*滚动容器*/}
        <div
          style={containerStyle()}
          class={bem('container')}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
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
              onSceneDown(e)
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

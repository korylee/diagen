import { createMemo, For, onMount, Show } from 'solid-js'
import { LinkerCanvas, ShapeCanvas } from './element'
import { SelectionBox, SelectionLayer, useDesigner } from '../components'
import { isLinker, isShape, type LinkerElement, Schema, screenToCanvas as _screenToCanvas } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { useDrag, useKeyboard, usePan, useResize, useSelection } from '../hooks'

export interface CanvasRendererProps {
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
}

/**
 * Canvas Renderer Component
 * Renders the diagram using reactive subscription to Designer
 * All interactions delegate to store methods
 */
export function CanvasRenderer(props: CanvasRendererProps) {
  const designer = useDesigner()
  const { element, selection, view, edit } = designer

  let containerRef: HTMLDivElement | undefined

  // 使用新的交互 hooks
  const drag = useDrag({ threshold: 3 })
  const pan = usePan({ button: 1 })
  const resize = useResize({ minWidth: 20, minHeight: 20 })
  const boxSelect = useSelection({ minSize: 5 })

  // 使用 mousetrap 风格的键盘 hook
  const kb = useKeyboard()
  kb.bind('delete', () => edit.remove(selection.selectedIds()))
  kb.bind('ctrl+a', () => selection.selectAll())
  kb.bind('escape', () => {
    if (drag.isDragging() || drag.isPending()) drag.cancel()
    if (pan.isPanning()) pan.end()
    if (resize.isResizing()) resize.cancel()
    if (boxSelect.isSelecting()) boxSelect.cancel()
  })

  // Update viewport size on mount and resize
  const updateViewportSize = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect()
      view.setCanvasSize(rect.width, rect.height)
    }
  }

  // Viewport calculations
  const pageStyle = createMemo(() => {
    const { page } = designer.state.diagram
    const { viewport } = designer.state
    return {
      width: `${page.width}px`,
      height: `${page.height}px`,
      'background-color': page.backgroundColor === 'transparent' ? 'white' : `rgb(${page.backgroundColor})`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      'transform-origin': '0 0',
      position: 'absolute' as const,
    }
  })

  // 坐标转换
  const screenToCanvas = (screen: Point): Point => _screenToCanvas(screen, view.viewport())

  // Mouse event handlers
  const handleCanvasMouseDown = (e: MouseEvent) => {
    if (e.target !== containerRef) return

    // 平移检测
    if (pan.canPan(e)) {
      pan.start(e)
      e.preventDefault()
      return
    }

    // 左键 - 框选
    if (e.button === 0) {
      selection.clear()
      const rect = containerRef!.getBoundingClientRect()
      boxSelect.start(screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }))
    }
  }

  const handleShapeMouseDown = (e: MouseEvent, id: string) => {
    e.stopPropagation()

    // 调整大小检测
    const rect = containerRef!.getBoundingClientRect()
    const point = screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    const hit = resize.hitTest(point)
    if (hit) {
      resize.start(hit.id, hit.dir, e)
      return
    }

    // 选择逻辑
    if (e.ctrlKey || e.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
    } else {
      selection.replace([id])
    }

    // 开始拖动
    drag.start(e)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (resize.isResizing()) {
      resize.move(e)
    } else if (pan.isPanning()) {
      pan.move(e)
    } else if (drag.isDragging() || drag.isPending()) {
      drag.move(e)
    } else if (boxSelect.isSelecting()) {
      const rect = containerRef!.getBoundingClientRect()
      boxSelect.move(screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }))
    }
  }

  const handleMouseUp = () => {
    if (resize.isResizing()) resize.end()
    else if (pan.isPanning()) pan.end()
    else if (drag.isDragging() || drag.isPending()) drag.end()
    else if (boxSelect.isSelecting()) boxSelect.end()
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    if (!containerRef) return
    const rect = containerRef.getBoundingClientRect()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.1, Math.min(5, designer.state.viewport.zoom + delta))
    designer.view.setZoom(newZoom, { x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  onMount(() => {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
    if (containerRef) {
      containerRef.addEventListener('wheel', handleWheel, { passive: false })
    }
    return () => window.removeEventListener('resize', updateViewportSize)
  })

  return (
    <div
      ref={containerRef}
      class={props.class}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        'background-color': '#f5f5f5',
        cursor: pan.isPanning() ? 'grabbing' : drag.isDragging() ? 'grabbing' : 'default',
        ...props.style,
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={pageStyle()}>
        <For each={element.elements()}>
          {(element: any) => {
            if (isShape(element)) {
              return <ShapeCanvas shape={element} onMouseDown={e => handleShapeMouseDown(e, element.id)} />
            }
            if (isLinker(element)) {
              // 确保 Linker 使用 Schema 中的定义（如果存在）
              const definition = (Schema as any).getLinker?.(element.name)
              const linkerWithDef = definition
                ? { ...element, linkerType: element.linkerType || definition.linkerType }
                : element

              return (
                <LinkerCanvas
                  linker={linkerWithDef as LinkerElement}
                  onMouseDown={e => handleShapeMouseDown(e, element.id)}
                />
              )
            }
            return null
          }}
        </For>
      </div>

      {/*选中框 resize手柄 rotate手柄 等交互*/}
      <SelectionBox
        onResizeStart={(dir, e) => {
          const ids = selection.selectedIds()
          if (ids.length === 1) resize.start(ids[0], dir, e)
        }}
      />

      {/* 框选层 - 用于显示框选区域 */}
      <Show when={boxSelect.isSelecting() && boxSelect.rect()}>
        {rect => <SelectionLayer rect={rect()} />}
      </Show>
    </div>
  )
}

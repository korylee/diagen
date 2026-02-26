import { createMemo, createSelector, createSignal, For, onMount } from 'solid-js'
import { ShapeCanvas } from './ShapeCanvas'
import { LinkerCanvas } from './LinkerCanvas'
import { SelectionBox } from './SelectionBox'
import { isShape, type LinkerElement, type Point, type ShapeElement, isLinker } from '@diagen/core'
import { useStore } from './StoreProvider'

export interface CanvasRendererProps {
  /** Optional class name for styling */
  class?: string
  /** Optional inline styles */
  style?: Record<string, string>
}

/**
 * Canvas Renderer Component
 * Renders the diagram using reactive subscription to DesignerStore
 * All interactions delegate to store methods
 */
export function CanvasRenderer(props: CanvasRendererProps) {
  const store = useStore()
  let containerRef: HTMLDivElement | undefined

  // Viewport size for canvas rendering
  const [viewportSize, setViewportSize] = createSignal({ width: 800, height: 600 })

  // Local state for drag operations
  const [isDragging, setIsDragging] = createSignal(false)
  const [isPanning, setIsPanning] = createSignal(false)
  const [dragStart, setDragStart] = createSignal<Point>({ x: 0, y: 0 })
  const [viewportStart, setViewportStart] = createSignal<Point>({ x: 0, y: 0 })
  const [selectedStartPositions, setSelectedStartPositions] = createSignal<Record<string, Point>>({})

  // Reactive selectors
  const isSelected = createSelector(() => store.selectedIds)

  // Memoized element list for rendering
  const elements = createMemo(() => {
    return store.orderList().map(id => store.elements()[id]).filter(Boolean)
  })

  // Memoized shapes only (for selection box calculation)
  const shapes = createMemo(() => elements().filter(isShape))

  // Update viewport size on mount and resize
  const updateViewportSize = () => {
    if (containerRef) {
      const rect = containerRef.getBoundingClientRect()
      setViewportSize({ width: rect.width, height: rect.height })
    }
  }

  // Helper to get shape by ID
  const getShapeById = (id: string): ShapeElement | undefined => {
    const el = store.getElementById(id)
    return isShape(el) ? el : undefined
  }

  // Viewport calculations
  const pageStyle = createMemo(() => {
    const { page } = store.state.diagram
    const { viewport } = store.state
    return {
      width: `${page.width}px`,
      height: `${page.height}px`,
      'background-color': page.backgroundColor === 'transparent' ? 'white' : `rgb(${page.backgroundColor})`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      'transform-origin': '0 0',
      position: 'absolute' as const,
    }
  })

  // Mouse event handlers
  const handleCanvasMouseDown = (e: MouseEvent) => {
    // Only handle if clicking directly on canvas (not on shapes)
    if (e.target !== containerRef) return

    // Middle mouse or Space+click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setViewportStart({ x: store.state.viewport.x, y: store.state.viewport.y })
      e.preventDefault()
      return
    }

    // Left click - clear selection and start box selection
    if (e.button === 0) {
      store.clearSelection()
    }
  }

  const handleShapeMouseDown = (e: MouseEvent, id: string) => {
    e.stopPropagation()

    // Toggle selection with Ctrl/Cmd
    if (e.ctrlKey || e.metaKey) {
      if (isSelected(id)) {
        // Deselect
        store.selection.deselect(id)
      } else {
        store.selection.select(id)
      }
    } else {
      // Select single (clear previous unless already selected)
      if (!isSelected(id)) {
        store.select(id)
      }
    }

    // Start drag operation
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })

    // Store initial positions of all selected elements
    const startPositions: Record<string, Point> = {}
    for (const selectedId of store.selectedIds) {
      const el = store.getElementById(selectedId)
      if (isShape(el)) {
        startPositions[selectedId] = { x: el.props.x, y: el.props.y }
      }
    }
    setSelectedStartPositions(startPositions)

    // Begin batch for history
    store.history.beginBatch()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning()) {
      const dx = e.clientX - dragStart().x
      const dy = e.clientY - dragStart().y
      store.pan(viewportStart().x + dx, viewportStart().y + dy)
      return
    }

    if (!isDragging()) return

    const dx = (e.clientX - dragStart().x) / store.state.viewport.zoom
    const dy = (e.clientY - dragStart().y) / store.state.viewport.zoom

    // Move all selected elements
    for (const id of store.selectedIds) {
      const startPos = selectedStartPositions()[id]
      if (startPos) {
        const el = store.state.diagram.elements[id]
        if (isShape(el)) {
          // Use updateElement for individual moves during drag (no history)
          // This will be replaced with proper drag handling
          store.updateElement(
            id,
            {
              props: {
                ...el.props,
                x: startPos.x + dx,
                y: startPos.y + dy,
              },
            },
            { recordHistory: false },
          )
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (isDragging()) {
      // Commit the batch operation
      store.history.commitBatch('Move elements')
    }

    if (isPanning()) {
      // Pan is complete
    }

    setIsDragging(false)
    setIsPanning(false)
    setSelectedStartPositions({})
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()

    if (!containerRef) return

    const rect = containerRef.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate zoom
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.1, Math.min(5, store.state.viewport.zoom + delta))

    store.setZoom(newZoom, { x: mouseX, y: mouseY })
  }

  onMount(() => {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)

    if (containerRef) {
      containerRef.addEventListener('wheel', handleWheel, { passive: false })
    }

    return () => {
      window.removeEventListener('resize', updateViewportSize)
    }
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
        cursor: isPanning() ? 'grabbing' : isDragging() ? 'grabbing' : 'default',
        ...props.style,
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={pageStyle()}>
        <For each={elements()}>
          {element => {
            if (isShape(element)) {
              return (
                <ShapeCanvas
                  shape={element}
                  viewport={store.state.viewport}
                  viewportSize={viewportSize()}
                  isSelected={isSelected(element.id)}
                  onMouseDown={e => handleShapeMouseDown(e, element.id)}
                />
              )
            }
            if (isLinker(element)) {
              return (
                <LinkerCanvas
                  linker={element}
                  viewport={store.state.viewport}
                  viewportSize={viewportSize()}
                  getShapeById={getShapeById}
                  isSelected={isSelected(element.id)}
                  onSelect={e => handleShapeMouseDown(e, element.id)}
                />
              )
            }
            return null
          }}
        </For>
      </div>

      {/* Selection Box Overlay */}
      <SelectionBox
        shapes={shapes()}
        selectedIds={store.selectedIds}
        viewport={store.state.viewport}
        onResize={(id, width, height) => {
          const shape = getShapeById(id)
          if (shape) {
            store.updateElement(id, {
              props: { ...shape.props, w: width, h: height },
            })
          }
        }}
      />
    </div>
  )
}

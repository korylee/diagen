/**
 * Playground App
 * Demonstrates the usage of DesignerStore with StoreProvider and CanvasRenderer
 */

import { createSignal, onMount, Show, For } from 'solid-js'
import { createDesignerStore, createDefaultShape } from '@diagen/core'
import { CanvasRenderer, useStore, StoreProvider } from '@diagen/renderer'
import type { ShapeElement, LinkerElement } from '@diagen/core'
import { generateId } from '@diagen/shared'

/**
 * Toolbar Component
 * Uses useStore to interact with the diagram
 */
function Toolbar() {
  const store = useStore()
  ;(window as any).store = store
  const [zoomDisplay, setZoomDisplay] = createSignal(100)

  // Update zoom display when viewport changes
  const updateZoomDisplay = () => {
    setZoomDisplay(Math.round(store.state.viewport.zoom * 100))
  }

  const addShape = () => {
    const id = generateId('shape')
    const shape: ShapeElement = {
      ...createDefaultShape(id, 'Rectangle'),
      props: {
        x: 200 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        w: 120,
        h: 80,
        angle: 0,
      },
      textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: 'New Shape' }],
    }

    store.addElement(shape, { select: true })
  }

  const addLinker = () => {
    const selected = store.selectedIds
    if (selected.length < 2) {
      alert('Select at least 2 shapes to connect')
      return
    }

    const fromId = selected[0]
    const toId = selected[1]
    const fromShape = store.getElementById(fromId)
    const toShape = store.getElementById(toId)

    if (fromShape?.type !== 'shape' || toShape?.type !== 'shape') {
      alert('Linkers can only connect shapes')
      return
    }

    const linker = store.createLinker(
      {
        id: fromId,
        x: (fromShape as ShapeElement).props.x + (fromShape as ShapeElement).props.w / 2,
        y: (fromShape as ShapeElement).props.y + (fromShape as ShapeElement).props.h / 2,
      },
      {
        id: toId,
        x: (toShape as ShapeElement).props.x + (toShape as ShapeElement).props.w / 2,
        y: (toShape as ShapeElement).props.y + (toShape as ShapeElement).props.h / 2,
      },
      'broken',
    )

    console.log('Created linker:', linker.id)
  }

  const deleteSelected = () => {
    const ids = store.selectedIds
    if (ids.length === 0) return
    store.removeElements(ids)
  }

  const zoomIn = () => {
    store.zoomIn()
    updateZoomDisplay()
  }

  const zoomOut = () => {
    store.zoomOut()
    updateZoomDisplay()
  }

  const fitToScreen = () => {
    store.zoomToFit()
    updateZoomDisplay()
  }

  const undo = () => {
    store.undo()
  }

  const redo = () => {
    store.redo()
  }

  const groupSelected = () => {
    const ids = store.selectedIds
    if (ids.length < 2) {
      alert('Select at least 2 elements to group')
      return
    }
    const groupId = store.group(ids)
    console.log('Created group:', groupId)
  }

  const ungroupSelected = () => {
    // Get unique groups from selection
    const groups = store.getGroupsFromElements(store.selectedIds)
    groups.forEach(groupId => store.ungroup(groupId))
  }

  const toggleGrid = () => {
    store.toggleGrid()
  }

  return (
    <div class="toolbar">
      <div class="toolbar-section">
        <button class="toolbar-button" onClick={addShape} title="添加矩形 (A)">
          <span class="icon">⬜</span>
          <span>Shape</span>
        </button>
        <button class="toolbar-button" onClick={addLinker} title="连接选中图形 (L)">
          <span class="icon">↔</span>
          <span>Link</span>
        </button>
        <button class="toolbar-button danger" onClick={deleteSelected} title="删除 (Del)">
          <span class="icon">🗑</span>
          <span>Delete</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={undo} title="撤销 (Ctrl+Z)">
          <span class="icon">↶</span>
        </button>
        <button class="toolbar-button" onClick={redo} title="重做 (Ctrl+Y)">
          <span class="icon">↷</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={groupSelected} title="分组 (Ctrl+G)">
          <span class="icon">📦</span>
          <span>Group</span>
        </button>
        <button class="toolbar-button" onClick={ungroupSelected} title="解组 (Ctrl+Shift+G)">
          <span class="icon">📂</span>
          <span>Ungroup</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={zoomOut} title="缩小 (-)">
          <span class="icon">−</span>
        </button>
        <span class="zoom-display">{zoomDisplay()}%</span>
        <button class="toolbar-button" onClick={zoomIn} title="放大 (+)">
          <span class="icon">+</span>
        </button>
        <button class="toolbar-button" onClick={fitToScreen} title="适应屏幕 (F)">
          <span class="icon">⛶</span>
          <span>Fit</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={toggleGrid} title="切换网格">
          <span class="icon">⊞</span>
          <span>Grid</span>
        </button>
      </div>

      <div class="toolbar-spacer" />

      <div class="toolbar-section">
        <span class="status-text">
          Selected: {store.selectedIds.length} | Total: {store.elementCount}
        </span>
      </div>
    </div>
  )
}

/**
 * Main Editor Component
 * Contains the CanvasRenderer
 */
function Editor() {
  return (
    <div class="editor-container">
      <CanvasRenderer />
    </div>
  )
}

/**
 * Sample Data Loader
 * Loads initial sample data into the store
 */
function SampleDataLoader() {
  const store = useStore()

  onMount(() => {
    // Add sample shapes
    const shape1Id = generateId('shape')
    const shape2Id = generateId('shape')
    const shape3Id = generateId('shape')

    const shapes: ShapeElement[] = [
      {
        ...createDefaultShape(shape1Id, 'Rectangle'),
        props: { x: 100, y: 150, w: 150, h: 100, angle: 0 },
        title: 'Start',
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '开始' }],
      },
      {
        ...createDefaultShape(shape2Id, 'Rectangle'),
        props: { x: 400, y: 150, w: 150, h: 100, angle: 0 },
        title: 'Process',
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '处理' }],
      },
      {
        ...createDefaultShape(shape3Id, 'Rectangle'),
        props: { x: 700, y: 150, w: 150, h: 100, angle: 0 },
        title: 'End',
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '结束' }],
      },
    ]

    // Add shapes without history and without auto-select
    shapes.forEach(shape => {
      store.addElement(shape, { recordHistory: false, select: false })
    })

    // Create linkers between shapes
    store.createLinker({ id: shape1Id, x: 250, y: 200 }, { id: shape2Id, x: 400, y: 200 }, 'broken', {
      recordHistory: false,
      select: false,
    })

    store.createLinker({ id: shape2Id, x: 550, y: 200 }, { id: shape3Id, x: 700, y: 200 }, 'broken', {
      recordHistory: false,
      select: false,
    })

    // Select first shape
    store.select(shape1Id)
  })

  return null
}

/**
 * App Component
 * Creates the DesignerStore and provides it to the tree
 */
export default function App() {
  // Create the store instance
  const store = createDesignerStore({
    id: 'playground',
    initialDiagram: {
      name: 'Playground Diagram',
      page: {
        width: 1200,
        height: 900,
        backgroundColor: '255,255,255',
      },
    },
  })

  return (
    <StoreProvider store={store}>
      <div class="app">
        <SampleDataLoader />
        <Toolbar />
        <Editor />
      </div>
    </StoreProvider>
  )
}

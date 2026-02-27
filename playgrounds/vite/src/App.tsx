/**
 * Playground App
 * Demonstrates the usage of Designer with DesignerProvider and CanvasRenderer
 */

import { batch, createSignal, onMount } from 'solid-js'
import type { LinkerElement, ShapeElement } from '@diagen/core'
import { createDesigner, Schema } from '@diagen/core'
import { CanvasRenderer, DesignerProvider, useDesigner } from '@diagen/renderer'
import { generateId } from '@diagen/shared'

/**
 * Toolbar Component
 * Uses useDesigner to interact with the diagram
 */
function Toolbar() {
  const designer = useDesigner()
  const { getElementById, selection, element } = designer
  ;(window as any).designer = designer
  const [zoomDisplay, setZoomDisplay] = createSignal(100)

  // Update zoom display when viewport changes
  const updateZoomDisplay = () => {
    setZoomDisplay(Math.round(designer.state.viewport.zoom * 100))
  }

  const addShape = () => {
    const shape = Schema.createShape(
      'rectangle',
      { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200, w: 120, h: 80, angle: 0 },
      {
        name: 'Rectangle',
        title: '结束',
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: 'ew Shape' }],
      },
    )!

    designer.edit.add([shape])
  }

  const addLinker = () => {
    const selected = selection.selectedIds()
    if (selected.length < 2) {
      alert('Select at least 2 shapes to connect')
      return
    }

    const fromId = selected[0]
    const toId = selected[1]
    const fromShape = getElementById(fromId)
    const toShape = getElementById(toId)

    if (fromShape?.type !== 'shape' || toShape?.type !== 'shape') {
      alert('Linkers can only connect shapes')
      return
    }

    const linker = Schema.createLinker(
      'linker',
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
    )!

    console.log('Created linker:', linker.id)
  }

  const deleteSelected = () => {
    const ids = selection.selectedIds()
    if (ids.length === 0) return
    designer.removeElements(ids)
  }

  const zoomIn = () => {
    designer.view.zoomIn()
    updateZoomDisplay()
  }

  const zoomOut = () => {
    designer.view.zoomOut()
    updateZoomDisplay()
  }

  const fitToScreen = () => {
    designer.view.zoomToFit()
    updateZoomDisplay()
  }

  const undo = () => {
    designer.undo()
  }

  const redo = () => {
    designer.redo()
  }

  const groupSelected = () => {
    const ids = selection.selectedIds()
    if (ids.length < 2) {
      alert('Select at least 2 elements to group')
      return
    }
    const groupId = designer.element.group(ids)
    console.log('Created group:', groupId)
  }

  const ungroupSelected = () => {
    // Get unique groups from selection
    const groups = designer.getGroupsFromElements(selection.selectedIds())
    groups.forEach(groupId => designer.element.ungroup(groupId))
  }

  const toggleGrid = () => {
    designer.toggleGrid()
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
          Selected: {selection.selectedIds().length} | Total: {element.elementCount()}
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
  const designer = useDesigner()

  onMount(() => {
    // Add sample shapes
    const shape1Id = generateId('shape')
    const shape2Id = generateId('shape')
    const shape3Id = generateId('shape')

    const shapes: ShapeElement[] = [
      Schema.createShape(
        'rectangle',
        { x: 100, y: 150, w: 150, h: 100, angle: 0 },
        {
          title: '开始',
          textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '开始' }],
        },
      )!,
      Schema.createShape(
        'rectangle',
        { x: 400, y: 150, w: 150, h: 100, angle: 0 },
        {
          title: '处理',
          textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '处理' }],
        },
      )!,
      Schema.createShape(
        'rectangle',
        { x: 700, y: 150, w: 150, h: 100, angle: 0 },
        {
          title: '结束',
          textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '结束' }],
        },
      )!,
    ]
    const linkers: LinkerElement[] = [
      Schema.createLinker('linker', { id: shape1Id, x: 250, y: 200 }, { id: shape2Id, x: 400, y: 200 })!,
      Schema.createLinker('linker', { id: shape2Id, x: 550, y: 200 }, { id: shape3Id, x: 700, y: 200 })!,
    ]

    batch(() => {
      designer.element.add(shapes)
      designer.element.add(linkers)
    })
    // Select first shape
    designer.selection.select(shape1Id)
  })

  return null
}

/**
 * App Component
 * Creates the Designer and provides it to the tree
 */
export default function App() {
  // Create the store instance
  const designer = createDesigner({
    initialPage: {
      width: 1200,
      height: 900,
      backgroundColor: '255,255,255',
    },
  })

  return (
    <DesignerProvider designer={designer}>
      <div class="app">
        <SampleDataLoader />
        <Toolbar />
        <Editor />
      </div>
    </DesignerProvider>
  )
}

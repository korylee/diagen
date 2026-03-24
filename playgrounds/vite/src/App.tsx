/**
 * Playground App
 * Demonstrates the usage of Designer with DesignerProvider and CanvasRenderer
 */

import { batch, createMemo, onMount } from 'solid-js'
import type { Accessor, JSX } from 'solid-js'
import type { Designer, LinkerElement, ShapeElement } from '@diagen/core'
import { createDesigner, Schema } from '@diagen/core'
import { DesignerSidebar, DesignerToolbar } from '@diagen/designer-ui'
import { DesignerProvider, Renderer, useDesigner } from '@diagen/renderer'
import { generateId } from '@diagen/shared'

interface EditorStatus {
  zoomDisplay: Accessor<string>
  selectionCount: Accessor<number>
  elementCount: Accessor<number>
}

function useEditorStatus(): EditorStatus {
  const designer = useDesigner()
  const { selection, element, view } = designer

  ;(window as any).designer = designer

  const zoomDisplay = createMemo<string>(() => (view.zoom() * 100).toFixed())
  const selectionCount = createMemo<number>(() => selection.selectedIds().length)
  const elementCount = createMemo<number>(() => element.elementCount())

  return {
    zoomDisplay,
    selectionCount,
    elementCount,
  }
}

function ToolbarStatus(props: { status: EditorStatus }): JSX.Element {
  return (
    <div class="toolbar-status">
      <span class="zoom-display">{props.status.zoomDisplay()}%</span>
      <span class="status-text">
        Selected: {props.status.selectionCount()} | Total: {props.status.elementCount()}
      </span>
    </div>
  )
}

function SidebarPanel(props: { designer: Designer; status: EditorStatus }): JSX.Element {
  return (
    <DesignerSidebar
      designer={props.designer}
      class="app-sidebar"
      searchPlaceholder="Search shapes or actions"
      emptyState="没有匹配的图元或动作"
      header={
        <>
          <div class="sidebar-brand">Diagen</div>
          <div class="sidebar-caption">designer-ui 负责将 Designer 状态映射为 Sidebar sections，宿主仅保留壳层插槽。</div>
        </>
      }
      footer={
        <div class="sidebar-footer">
          <div>Zoom {props.status.zoomDisplay()}%</div>
          <div>
            Selected {props.status.selectionCount()} / Total {props.status.elementCount()}
          </div>
        </div>
      }
    />
  )
}

function Editor(): JSX.Element {
  return (
    <div class="editor-container">
      <Renderer />
    </div>
  )
}

function EditorShell(): JSX.Element {
  const designer = useDesigner()
  const status = useEditorStatus()

  return (
    <div class="app">
      <SampleDataLoader />
      <DesignerToolbar designer={designer} rightSlot={<ToolbarStatus status={status} />} />
      <div class="app-body">
        <SidebarPanel designer={designer} status={status} />
        <Editor />
      </div>
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
          id: shape1Id,
          title: '开始',
          textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '开始' }],
        },
      )!,
      Schema.createShape(
        'rectangle',
        { x: 400, y: 150, w: 150, h: 100, angle: 0 },
        {
          id: shape2Id,
          title: '处理',
          textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '处理' }],
        },
      )!,
      Schema.createShape(
        'rectangle',
        { x: 700, y: 150, w: 150, h: 100, angle: 0 },
        {
          id: shape3Id,
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
    page: {
      width: 1200,
      height: 900,
      backgroundColor: 'rgb(255,255,255)',
    },
  })

  return (
    <DesignerProvider designer={designer}>
      <EditorShell />
    </DesignerProvider>
  )
}

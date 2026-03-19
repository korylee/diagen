/**
 * Playground App
 * Demonstrates the usage of Designer with DesignerProvider and CanvasRenderer
 */

import { batch, createMemo, createSignal, onMount } from 'solid-js'
import type { Accessor, JSX } from 'solid-js'
import type { LinkerElement, ShapeElement } from '@diagen/core'
import { createDesigner, Schema } from '@diagen/core'
import { DesignerProvider, Renderer, useDesigner } from '@diagen/renderer'
import { generateId } from '@diagen/shared'
import { Sidebar, type SidebarSection } from '@diagen/ui'

interface EditorActions {
  activeSidebarItemId: Accessor<string | undefined>
  zoomDisplay: Accessor<string>
  selectionCount: Accessor<number>
  elementCount: Accessor<number>
  canGroup: Accessor<boolean>
  canUngroup: Accessor<boolean>
  canDelete: Accessor<boolean>
  canUndo: Accessor<boolean>
  canRedo: Accessor<boolean>
  addShape: () => void
  addLinker: () => void
  deleteSelected: () => void
  zoomIn: () => void
  zoomOut: () => void
  fitToScreen: () => void
  undo: () => void
  redo: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  toggleRectangleTool: () => void
  toggleLinkerTool: () => void
}

function ShapePalettePreview(props: { kind: 'rectangle' | 'linker' | 'plus' | 'connect'; accent: string }): JSX.Element {
  return (
    <svg class="sidebar-preview" viewBox="0 0 64 48" aria-hidden="true">
      {props.kind === 'rectangle' && (
        <rect x="11" y="10" width="42" height="28" rx="6" fill="none" stroke={props.accent} stroke-width="3" />
      )}
      {props.kind === 'linker' && (
        <>
          <circle cx="14" cy="24" r="4" fill={props.accent} />
          <circle cx="50" cy="24" r="4" fill={props.accent} />
          <path d="M18 24 H46" fill="none" stroke={props.accent} stroke-width="3" stroke-linecap="round" />
        </>
      )}
      {props.kind === 'plus' && (
        <>
          <rect x="17" y="9" width="30" height="30" rx="8" fill="none" stroke={props.accent} stroke-width="3" />
          <path d="M32 16 V32 M24 24 H40" fill="none" stroke={props.accent} stroke-width="3" stroke-linecap="round" />
        </>
      )}
      {props.kind === 'connect' && (
        <>
          <rect x="8" y="14" width="14" height="14" rx="4" fill="none" stroke={props.accent} stroke-width="3" />
          <rect x="42" y="20" width="14" height="14" rx="4" fill="none" stroke={props.accent} stroke-width="3" />
          <path d="M22 21 C29 21 30 27 42 27" fill="none" stroke={props.accent} stroke-width="3" stroke-linecap="round" />
        </>
      )}
    </svg>
  )
}

function UtilityPreview(props: { label: string; accent: string }): JSX.Element {
  return <span class="sidebar-chip" style={{ color: props.accent, 'border-color': props.accent }}>{props.label}</span>
}

function matchesSidebarItem(query: string, item: { label: string; description?: string; meta?: string; keywords?: readonly string[] }): boolean {
  if (query === '') {
    return true
  }

  const haystack = [item.label, item.description ?? '', item.meta ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase()
  return haystack.includes(query)
}

function buildSidebarSections(actions: EditorActions): SidebarSection[] {
  return [
    {
      id: 'palette',
      title: 'Shape Palette',
      description: '参考 shape panel 的组织方式，但保持宿主层自由接线。',
      meta: '4',
      layout: 'grid',
      items: [
        {
          id: 'tool:shape:rectangle',
          label: 'Rectangle',
          description: '进入块创建态',
          preview: <ShapePalettePreview kind="rectangle" accent="#b45309" />,
          badge: 'Tool',
          keywords: ['shape', 'block', 'create', 'rectangle'],
          onSelect: actions.toggleRectangleTool,
        },
        {
          id: 'tool:linker:linker',
          label: 'Linker',
          description: '进入连线创建态',
          preview: <ShapePalettePreview kind="linker" accent="#0f766e" />,
          badge: 'Tool',
          keywords: ['line', 'connector', 'linker', 'create'],
          onSelect: actions.toggleLinkerTool,
        },
        {
          id: 'action:add-rectangle',
          label: 'Quick Rect',
          description: '直接插入矩形',
          preview: <ShapePalettePreview kind="plus" accent="#2563eb" />,
          meta: 'Now',
          keywords: ['insert', 'shape', 'rectangle', 'quick'],
          onSelect: actions.addShape,
        },
        {
          id: 'action:add-linker',
          label: 'Connect',
          description: '连接当前选择',
          preview: <ShapePalettePreview kind="connect" accent="#7c3aed" />,
          meta: '2+',
          keywords: ['connect', 'link', 'selection'],
          onSelect: actions.addLinker,
          disabled: actions.selectionCount() < 2,
        },
      ],
    },
    {
      id: 'arrange',
      title: 'Arrange',
      meta: '3',
      layout: 'list',
      collapsible: true,
      items: [
        {
          id: 'action:group',
          label: 'Group',
          description: '对当前选择创建分组',
          icon: <UtilityPreview label="G" accent="#be123c" />,
          keywords: ['group', 'arrange', 'selection'],
          onSelect: actions.groupSelected,
          disabled: !actions.canGroup(),
        },
        {
          id: 'action:ungroup',
          label: 'Ungroup',
          description: '解散当前选中分组',
          icon: <UtilityPreview label="U" accent="#475569" />,
          keywords: ['ungroup', 'arrange', 'selection'],
          onSelect: actions.ungroupSelected,
          disabled: !actions.canUngroup(),
        },
        {
          id: 'action:delete',
          label: 'Delete Selection',
          description: '删除当前选中元素',
          icon: <UtilityPreview label="D" accent="#dc2626" />,
          keywords: ['delete', 'remove', 'selection'],
          onSelect: actions.deleteSelected,
          disabled: !actions.canDelete(),
        },
      ],
    },
    {
      id: 'history',
      title: 'History & View',
      meta: '3',
      layout: 'list',
      collapsible: true,
      defaultCollapsed: true,
      items: [
        {
          id: 'action:undo',
          label: 'Undo',
          description: '撤销上一步操作',
          icon: <UtilityPreview label="Z" accent="#1d4ed8" />,
          keywords: ['undo', 'history'],
          onSelect: actions.undo,
          disabled: !actions.canUndo(),
        },
        {
          id: 'action:redo',
          label: 'Redo',
          description: '重做已撤销操作',
          icon: <UtilityPreview label="Y" accent="#0369a1" />,
          keywords: ['redo', 'history'],
          onSelect: actions.redo,
          disabled: !actions.canRedo(),
        },
        {
          id: 'action:fit',
          label: 'Fit To Content',
          description: '适配当前内容范围',
          icon: <UtilityPreview label="F" accent="#15803d" />,
          keywords: ['fit', 'view', 'zoom'],
          onSelect: actions.fitToScreen,
        },
      ],
    },
  ]
}

function filterSidebarSections(sections: readonly SidebarSection[], query: string): SidebarSection[] {
  return sections
    .map(section => {
      const items = section.items.filter(item => matchesSidebarItem(query, item))
      return {
        ...section,
        items,
        meta: items.length.toString(),
      }
    })
    .filter(section => section.items.length > 0)
}

function useEditorActions(): EditorActions {
  const designer = useDesigner()
  const { getElementById, selection, element, view, tool } = designer

  ;(window as any).designer = designer

  const zoomDisplay = createMemo<string>(() => (view.zoom() * 100).toFixed())
  const selectionCount = createMemo<number>(() => selection.selectedIds().length)
  const elementCount = createMemo<number>(() => element.elementCount())
  const selectedGroupCount = createMemo<number>(() => designer.group.getGroupsFromElements(selection.selectedIds()).size)
  const canGroup = createMemo<boolean>(() => selectionCount() > 1)
  const canUngroup = createMemo<boolean>(() => selectedGroupCount() > 0)
  const canDelete = createMemo<boolean>(() => selectionCount() > 0)
  const canUndo = createMemo<boolean>(() => designer.canUndo())
  const canRedo = createMemo<boolean>(() => designer.canRedo())
  const activeSidebarItemId = createMemo<string | undefined>(() => {
    const current = tool.tool()

    if (current.type === 'create-shape') {
      return `tool:shape:${current.shapeId}`
    }

    if (current.type === 'create-linker') {
      return `tool:linker:${current.linkerId}`
    }

    return undefined
  })

  const addShape = (): void => {
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

  const addLinker = (): void => {
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
        binding: { type: 'free' },
      },
      {
        id: toId,
        x: (toShape as ShapeElement).props.x + (toShape as ShapeElement).props.w / 2,
        y: (toShape as ShapeElement).props.y + (toShape as ShapeElement).props.h / 2,
        binding: { type: 'free' },
      },
    )!

    designer.edit.add([linker])
    console.log('Created linker:', linker.id)
  }

  const deleteSelected = (): void => {
    const ids = selection.selectedIds()
    if (ids.length === 0) {
      return
    }

    designer.removeElements(ids)
  }

  const zoomIn = (): void => {
    designer.view.zoomIn()
  }

  const zoomOut = (): void => {
    designer.view.zoomOut()
  }

  const fitToScreen = (): void => {
    designer.view.fitToContent()
  }

  const undo = (): void => {
    designer.undo()
  }

  const redo = (): void => {
    designer.redo()
  }

  const groupSelected = (): void => {
    const ids = selection.selectedIds()
    if (ids.length < 2) {
      alert('Select at least 2 elements to group')
      return
    }

    const groupId = designer.element.group(ids)
    console.log('Created group:', groupId)
  }

  const ungroupSelected = (): void => {
    const groups = designer.group.getGroupsFromElements(selection.selectedIds())
    groups.forEach(groupId => designer.element.ungroup(groupId))
  }

  const toggleRectangleTool = (): void => {
    designer.tool.toggleCreateShape('rectangle')
  }

  const toggleLinkerTool = (): void => {
    designer.tool.toggleCreateLinker('linker')
  }

  return {
    activeSidebarItemId,
    zoomDisplay,
    selectionCount,
    elementCount,
    canGroup,
    canUngroup,
    canDelete,
    canUndo,
    canRedo,
    addShape,
    addLinker,
    deleteSelected,
    zoomIn,
    zoomOut,
    fitToScreen,
    undo,
    redo,
    groupSelected,
    ungroupSelected,
    toggleRectangleTool,
    toggleLinkerTool,
  }
}

/**
 * Toolbar Component
 * Uses useDesigner to interact with the diagram
 */
function Toolbar(props: { actions: EditorActions }): JSX.Element {
  return (
    <div class="toolbar">
      <div class="toolbar-section">
        <button class="toolbar-button" onClick={props.actions.addShape} title="添加矩形">
          <span class="icon">⬜</span>
          <span>Shape</span>
        </button>
        <button class="toolbar-button" onClick={props.actions.addLinker} title="连接选中图形">
          <span class="icon">↔</span>
          <span>Link</span>
        </button>
        <button class="toolbar-button danger" onClick={props.actions.deleteSelected} title="删除">
          <span class="icon">🗑</span>
          <span>Delete</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={props.actions.undo} title="撤销">
          <span class="icon">↶</span>
        </button>
        <button class="toolbar-button" onClick={props.actions.redo} title="重做">
          <span class="icon">↷</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={props.actions.groupSelected} title="分组">
          <span class="icon">📦</span>
          <span>Group</span>
        </button>
        <button class="toolbar-button" onClick={props.actions.ungroupSelected} title="解组">
          <span class="icon">📂</span>
          <span>Ungroup</span>
        </button>
      </div>

      <div class="toolbar-separator" />

      <div class="toolbar-section">
        <button class="toolbar-button" onClick={props.actions.zoomOut} title="缩小">
          <span class="icon">−</span>
        </button>
        <span class="zoom-display">{props.actions.zoomDisplay()}%</span>
        <button class="toolbar-button" onClick={props.actions.zoomIn} title="放大">
          <span class="icon">+</span>
        </button>
        <button class="toolbar-button" onClick={props.actions.fitToScreen} title="适应屏幕">
          <span class="icon">⛶</span>
          <span>Fit</span>
        </button>
      </div>

      <div class="toolbar-spacer" />

      <div class="toolbar-section">
        <span class="status-text">
          Selected: {props.actions.selectionCount()} | Total: {props.actions.elementCount()}
        </span>
      </div>
    </div>
  )
}

function SidebarPanel(props: { actions: EditorActions }): JSX.Element {
  const [searchValue, setSearchValue] = createSignal<string>('')
  const normalizedQuery = createMemo<string>(() => searchValue().trim().toLowerCase())
  const baseSections = createMemo<SidebarSection[]>(() => buildSidebarSections(props.actions))
  const sections = createMemo<SidebarSection[]>(() => filterSidebarSections(baseSections(), normalizedQuery()))

  return (
    <Sidebar
      class="app-sidebar"
      sections={sections()}
      activeItemId={props.actions.activeSidebarItemId()}
      search={{
        value: searchValue(),
        placeholder: 'Search shapes or actions',
        onInput: setSearchValue,
        onClear: () => setSearchValue(''),
      }}
      emptyState="没有匹配的图元或动作"
      header={
        <>
          <div class="sidebar-brand">Diagen</div>
          <div class="sidebar-caption">Sidebar 作为面板框架保留搜索、折叠分组、grid/list，便于后续继续演化。</div>
        </>
      }
      footer={
        <div class="sidebar-footer">
          <div>Zoom {props.actions.zoomDisplay()}%</div>
          <div>
            Selected {props.actions.selectionCount()} / Total {props.actions.elementCount()}
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
  const actions = useEditorActions()

  return (
    <div class="app">
      <SampleDataLoader />
      <Toolbar actions={actions} />
      <div class="app-body">
        <SidebarPanel actions={actions} />
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

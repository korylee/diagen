/**
 * Designer Store
 * Main state management for the editor using SolidJS createStore
 * Function-based implementation for better flexibility and plugin support
 */

import { createStore } from 'solid-js/store'

import type { Point, Rect, Viewport } from '@diagen/shared'
import { createEmitter, deepClone, deepMerge, generateId } from '@diagen/shared'

import type { Diagram, DiagramElement, LinkerElement, LinkerEndpoint, ShapeElement } from '../model'
import { createDefaultLinker, createEmptyDiagram, isLinker, isShape } from '../model'
import type { LinkerType } from '../constants'
import { ToolType } from '../constants'
import { HistoryManager } from '../history'
import type { ICommand } from '../history/Command'
import { SelectionManager } from '../selection'
import { createMemo } from 'solid-js'

// ============================================================================
// Store State Types
// ============================================================================

interface UIState {
  showGrid: boolean
  showRulers: boolean
  showMiniMap: boolean
  snapToGrid: boolean
  gridSize: number
}

export interface EditorState {
  diagram: Diagram
  viewport: Viewport
  canvasSize: {
    width: number
    height: number
  }
  activeTool: ToolType
  ui: UIState
  performance: {
    disableLineJumps: boolean
  }
}

// ============================================================================
// Designer Store Options
// ============================================================================

export interface DesignerStoreOptions {
  id?: string
  initialDiagram?: Partial<Diagram>
  initialViewport?: Partial<Viewport>
  maxHistorySize?: number
  onHistoryChange?: (undoCount: number, redoCount: number) => void
  onStateChange?: (state: EditorState) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

function createInitialState(options: DesignerStoreOptions): EditorState {
  const diagram = createEmptyDiagram(options.id || generateId('diagram'), options.initialDiagram)

  return {
    diagram,
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      ...options.initialViewport,
    },
    canvasSize: {
      width: 800,
      height: 600,
    },
    activeTool: 'select',
    ui: {
      showGrid: true,
      showRulers: false,
      showMiniMap: false,
      snapToGrid: true,
      gridSize: 15,
    },
    performance: {
      disableLineJumps: false,
    },
  }
}

// ============================================================================
// Designer Store Factory Function
// ============================================================================

export function createDesignerStore(options: DesignerStoreOptions = {}) {
  const id = options.id || generateId('editor')
  const emitter = createEmitter()

  const initialState = createInitialState(options)
  const [state, setState] = createStore(initialState)
  const elements = createMemo(() => state.diagram.elements)
  const orderList = createMemo(() => state.diagram.orderList)
  const page = createMemo(() => state.diagram.page)
  const viewport = createMemo(() => state.viewport)
  const activeTool = createMemo(() => state.activeTool)

  const selection = new SelectionManager()
  const history = new HistoryManager({
    maxSize: options.maxHistorySize,
    onStackChange: options.onHistoryChange,
  })

  function getElementById(id: string): DiagramElement | undefined {
    return elements()[id]
  }

  function _addElements(elements: DiagramElement[]) {
    const ids: string[] = []
    for (const element of elements) {
      setState('diagram', 'elements', element.id, element)
      ids.push(element.id)
    }
    setState('diagram', 'orderList', list => [...list, ...ids])
    emitter.emit('element:added', elements)
  }
  function _removeElements(els: (string | DiagramElement)[]) {
    const ids = els.map(el => (typeof el === 'string' ? el : el.id)).filter(id => getElementById(id))
    setState('diagram', 'elements', els => {
      const newEls = { ...els }
      for (const id of ids) {
        delete newEls[id]
      }
      return newEls
    })

    setState('diagram', 'orderList', list => list.filter(id => !ids.includes(id)))

    emitter.emit('element:removed', ids)
  }
  function addElement(element: DiagramElement, options: { recordHistory?: boolean; select?: boolean } = {}): void {
    const { recordHistory = true, select = true } = options

    const command: ICommand = {
      id: generateId('cmd_add'),
      name: `Add ${element.name || 'element'}`,

      execute: () => {
        _addElements([element])
      },

      undo: () => {
        _removeElements([element])
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }

    if (select) {
      selection.replace([element.id])
    }
  }

  function updateElement(id: string, patch: Partial<DiagramElement>, options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = true } = options

    const element = getElementById(id)
    if (!element) {
      console.warn(`Element ${id} not found`)
      return
    }

    const previousValues: Record<string, unknown> = {}

    const command: ICommand = {
      id: generateId('cmd_update'),
      name: 'Update element',

      execute: () => {
        setState('diagram', 'elements', id, el => {
          return deepMerge(deepClone(el), patch)
        })
      },

      undo: () => {
        setState('diagram', 'elements', id, el => {
          return deepMerge(deepClone(el), previousValues) as DiagramElement
        })
      },

      redo: () => {
        command.execute()
      },
    }

    for (const key in patch) {
      previousValues[key] = (element as any)[key]
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }
  }

  function removeElements(ids: string[], options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = true } = options

    if (ids.length === 0) return

    const elements = ids.map(id => getElementById(id)).filter(el => !!el)

    const command: ICommand = {
      id: generateId('cmd_remove'),
      name: `Remove ${ids.length} element(s)`,

      execute: () => {
        _removeElements(ids)

        selection.deselectMultiple(ids)
      },

      undo: () => {
        _addElements(elements)
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }
  }

  function moveElements(
    ids: string[],
    deltaX: number,
    deltaY: number,
    options: { recordHistory?: boolean } = {},
  ): void {
    const { recordHistory = true } = options

    if (ids.length === 0 || (deltaX === 0 && deltaY === 0)) return

    const expandedIds = expandSelectionToGroups(ids)

    const previousShapePositions: Record<string, Point> = {}
    const previousLinkerState: Record<
      string,
      {
        from: Point
        to: Point
        points: Array<Point>
      }
    > = {}

    for (const id of expandedIds) {
      const element = elements()[id]
      if (!element) continue

      if (isShape(element)) {
        previousShapePositions[id] = {
          x: element.props.x,
          y: element.props.y,
        }
      } else if (isLinker(element)) {
        const isFreeLinker = element.from.id === null && element.to.id === null
        if (isFreeLinker) {
          previousLinkerState[id] = {
            from: { x: element.from.x, y: element.from.y },
            to: { x: element.to.x, y: element.to.y },
            points: element.points.map(p => ({ x: p.x, y: p.y })),
          }
        }
      }
    }

    const command: ICommand = {
      id: generateId('cmd_move'),
      name: `Move ${expandedIds.length} element(s)`,

      execute: () => {
        for (const id of expandedIds) {
          const element = elements()[id]
          if (!element) continue

          if (isShape(element)) {
            const shape = element as ShapeElement
            const updatedShape: ShapeElement = {
              ...shape,
              props: {
                ...shape.props,
                x: shape.props.x + deltaX,
                y: shape.props.y + deltaY,
              },
            }
            setState('diagram', 'elements', id, updatedShape)
          } else if (isLinker(element)) {
            const linker = element as LinkerElement
            const isFreeLinker = linker.from.id === null && linker.to.id === null
            if (isFreeLinker) {
              const updatedLinker: LinkerElement = {
                ...linker,
                from: {
                  ...linker.from,
                  x: linker.from.x + deltaX,
                  y: linker.from.y + deltaY,
                },
                to: {
                  ...linker.to,
                  x: linker.to.x + deltaX,
                  y: linker.to.y + deltaY,
                },
                points: linker.points.map(p => ({
                  x: p.x + deltaX,
                  y: p.y + deltaY,
                })),
              }
              setState('diagram', 'elements', id, updatedLinker)
            }
          }
        }
      },

      undo: () => {
        for (const id in previousShapePositions) {
          const element = elements()[id]
          if (!element || !isShape(element)) continue
          const shape = element as ShapeElement
          const pos = previousShapePositions[id]
          const restoredShape: ShapeElement = {
            ...shape,
            props: {
              ...shape.props,
              x: pos.x,
              y: pos.y,
            },
          }
          setState('diagram', 'elements', id, restoredShape)
        }

        for (const id in previousLinkerState) {
          const element = elements()[id]
          if (!isLinker(element)) continue
          const linker = element as LinkerElement
          const state = previousLinkerState[id]
          const restoredLinker: LinkerElement = {
            ...linker,
            from: {
              ...linker.from,
              x: state.from.x,
              y: state.from.y,
            },
            to: {
              ...linker.to,
              x: state.to.x,
              y: state.to.y,
            },
            points: state.points,
          }
          setState('diagram', 'elements', id, restoredLinker)
        }
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }
  }

  function select(ids: string | string[], clearPrevious = true): void {
    const idArray = Array.isArray(ids) ? ids : [ids]

    if (clearPrevious) {
      selection.replace(idArray)
    } else {
      selection.selectMultiple(idArray)
    }
  }

  function clearSelection(): void {
    selection.clear()
  }

  function getSelectedElements(): DiagramElement[] {
    return selection
      .getSelection()
      .map(id => elements()[id])
      .filter(Boolean)
  }

  function setZoom(zoom: number, center?: Point): void {
    const minZoom = 0.1
    const maxZoom = 5
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom))

    if (center) {
      const oldZoom = state.viewport.zoom
      const scale = newZoom / oldZoom

      setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - state.viewport.x) * scale,
        y: center.y - (center.y - state.viewport.y) * scale,
      })
    } else {
      setState('viewport', 'zoom', newZoom)
    }
  }

  function zoomIn(): void {
    setZoom(state.viewport.zoom + 0.1)
  }

  function zoomOut(): void {
    setZoom(state.viewport.zoom - 0.1)
  }

  function zoomToFit(padding = 50): void {
    const els = orderList()
      .map(id => elements()[id])
      .filter(isShape)

    if (els.length === 0) {
      setZoom(1)
      return
    }

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const el of els) {
      const { x, y, w, h } = el.props
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + w)
      maxY = Math.max(maxY, y + h)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const viewportWidth = state.canvasSize.width
    const viewportHeight = state.canvasSize.height

    const zoomX = (viewportWidth - padding * 2) / contentWidth
    const zoomY = (viewportHeight - padding * 2) / contentHeight
    const newZoom = Math.min(zoomX, zoomY, 1)

    setState('viewport', {
      zoom: newZoom,
      x: (viewportWidth - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (viewportHeight - contentHeight * newZoom) / 2 - minY * newZoom,
    })
  }

  function pan(deltaX: number, deltaY: number): void {
    setState('viewport', {
      x: state.viewport.x + deltaX,
      y: state.viewport.y + deltaY,
    })
  }

  function setCanvasSize(width: number, height: number): void {
    setState('canvasSize', { width, height })
  }

  function setTool(tool: ToolType): void {
    setState('activeTool', tool)
  }

  function toggleGrid(): void {
    const value = !state.ui.showGrid
    setState('ui', 'showGrid', value)
    emitter.emit('ui:showGrid', value)
  }

  function toggleSnapToGrid(): void {
    setState('ui', 'snapToGrid', !state.ui.snapToGrid)
  }

  function setGridSize(size: number): void {
    setState('ui', 'gridSize', size)
  }

  function serialize(): string {
    return JSON.stringify(state.diagram, null, 2)
  }

  function loadFromJSON(json: string, options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = false } = options

    const diagram = JSON.parse(json) as Diagram

    const command: ICommand = {
      id: generateId('cmd_load'),
      name: 'Load diagram',

      execute: () => {
        setState('diagram', diagram)
      },

      undo: () => {
        setState('diagram', 'elements', {})
        setState('diagram', 'orderList', [])
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }

    selection.clear()
  }

  function clear(options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = true } = options

    const elements = deepClone(state.diagram.elements)
    const orderList = [...state.diagram.orderList]

    const command: ICommand = {
      id: generateId('cmd_clear'),
      name: 'Clear diagram',

      execute: () => {
        setState('diagram', 'elements', {})
        setState('diagram', 'orderList', [])
        selection.clear()
      },

      undo: () => {
        setState('diagram', 'elements', elements)
        setState('diagram', 'orderList', orderList)
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }
  }

  function createLinker(from: LinkerEndpoint, to: LinkerEndpoint, type: LinkerType = 'broken'): LinkerElement {
    const linker = createDefaultLinker(generateId('linker'), {
      from: { ...from },
      to: { ...to },
      linkerType: type,
    })
    const command: ICommand = {
      id: generateId('cmd_create_linker'),
      name: 'Create linker',

      execute: () => {
        setState('diagram', 'elements', linker.id, linker)
        setState('diagram', 'orderList', list => [...list, linker.id])
      },

      undo: () => {
        setState('diagram', 'elements', els => {
          const { [linker.id]: _, ...rest } = els
          return rest
        })
        setState('diagram', 'orderList', list => list.filter(id => id !== linker.id))
      },

      redo: () => {
        command.execute()
      },
    }

    history.execute(command)

    return linker
  }

  function group(ids: string[], options: { recordHistory?: boolean } = {}): string | null {
    const { recordHistory = true } = options

    if (ids.length < 2) {
      console.warn('Need at least 2 elements to form a group')
      return null
    }

    const elements = ids.map(id => state.diagram.elements[id]).filter(Boolean)
    if (elements.length !== ids.length) {
      console.warn('Some elements not found')
      return null
    }

    const groupId = generateId('group')

    const previousGroups: Record<string, string | null> = {}
    for (const id of ids) {
      const el = state.diagram.elements[id]
      if (el) {
        previousGroups[id] = el.group
      }
    }

    const command: ICommand = {
      id: generateId('cmd_group'),
      name: `Group ${ids.length} elements`,

      execute: () => {
        for (const id of ids) {
          setState('diagram', 'elements', id, (el: DiagramElement) => ({
            ...el,
            group: groupId,
          }))
        }
      },

      undo: () => {
        for (const id of ids) {
          setState('diagram', 'elements', id, (el: DiagramElement) => ({
            ...el,
            group: previousGroups[id],
          }))
        }
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }

    return groupId
  }

  function ungroup(groupId: string, options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = true } = options

    const groupElements = getGroupShapes(groupId)
    if (groupElements.length === 0) {
      console.warn(`Group ${groupId} not found or empty`)
      return
    }

    const ids = groupElements.map(el => el.id)

    const previousGroups: Record<string, string | null> = {}
    for (const el of groupElements) {
      previousGroups[el.id] = el.group
    }

    const command: ICommand = {
      id: generateId('cmd_ungroup'),
      name: `Ungroup ${ids.length} elements`,

      execute: () => {
        for (const id of ids) {
          setState('diagram', 'elements', id, (el: DiagramElement) => ({
            ...el,
            group: null,
          }))
        }
      },

      undo: () => {
        for (const id of ids) {
          setState('diagram', 'elements', id, (el: DiagramElement) => ({
            ...el,
            group: previousGroups[id],
          }))
        }
      },

      redo: () => {
        command.execute()
      },
    }

    if (recordHistory) {
      history.execute(command)
    } else {
      command.execute()
    }
  }

  function getGroupShapes(groupId: string): DiagramElement[] {
    return Object.values(state.diagram.elements).filter(el => el.group === groupId)
  }

  function isInSameGroup(ids: string[]): boolean {
    if (ids.length < 2) return false

    const first = state.diagram.elements[ids[0]]
    if (!first || !first.group) return false

    const groupId = first.group
    return ids.every(id => {
      const el = state.diagram.elements[id]
      return el && el.group === groupId
    })
  }

  function getGroupsFromElements(ids: string[]): Set<string> {
    const groups = new Set<string>()
    for (const id of ids) {
      const el = state.diagram.elements[id]
      if (el?.group) {
        groups.add(el.group)
      }
    }
    return groups
  }

  function expandSelectionToGroups(ids: string[]): string[] {
    const result = new Set(ids)
    const groups = getGroupsFromElements(ids)

    for (const groupId of groups) {
      const groupMembers = getGroupShapes(groupId)
      for (const member of groupMembers) {
        result.add(member.id)
      }
    }

    return Array.from(result)
  }

  function getElementBounds(id: string): Rect | null {
    const element = getElementById(id)
    if (!element) return null

    if (isShape(element)) {
      const props = element.props
      return {
        x: props.x,
        y: props.y,
        w: props.w,
        h: props.h,
      }
    }

    if (isLinker(element)) {
      const from = element.from
      const to = element.to

      const minX = Math.min(from.x, to.x)
      const minY = Math.min(from.y, to.y)
      const maxX = Math.max(from.x, to.x)
      const maxY = Math.max(from.y, to.y)

      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      }
    }

    return null
  }

  function getSelectionBounds(): Rect | null {
    const selectedIds = selection.getSelection()
    if (selectedIds.length === 0) return null

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const id of selectedIds) {
      const bounds = getElementBounds(id)
      if (bounds) {
        minX = Math.min(minX, bounds.x)
        minY = Math.min(minY, bounds.y)
        maxX = Math.max(maxX, bounds.x + bounds.w)
        maxY = Math.max(maxY, bounds.y + bounds.h)
      }
    }

    if (minX === Infinity) return null

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    }
  }

  function dispose(): void {
    history.clear()
    selection.clear()
  }

  return {
    id: id,
    state,
    history,
    selection,

    elements,
    orderList,
    page,
    viewport,
    activeTool,

    get elementCount() {
      return state.diagram.orderList.length
    },
    get selectedIds() {
      return selection.getSelection()
    },

    getElementById,
    addElement,
    updateElement,
    removeElements,
    moveElements,
    select,
    clearSelection,
    getSelectedElements,
    setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    pan,
    setCanvasSize,
    setTool,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    serialize,
    loadFromJSON,
    clear,
    createLinker,
    group,
    ungroup,
    getGroupShapes,
    isInSameGroup,
    getGroupsFromElements,
    expandSelectionToGroups,
    getElementBounds,
    getSelectionBounds,
    dispose,
  }
}

export type DesignerStore = ReturnType<typeof createDesignerStore>

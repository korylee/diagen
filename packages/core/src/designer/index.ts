import { createStore } from 'solid-js/store'

import type { Viewport } from '../utils'
import { createEmitter, generateId } from '@diagen/shared'

import { createMemo } from 'solid-js'
import { ToolType } from '../constants'
import type { Diagram, DiagramElement } from '../model'
import { createEmptyDiagram } from '../model'
import {
  type Command,
  createEditManager,
  createElementManager,
  createHistoryManager,
  createSelectionManager,
  createViewManager,
} from './managers'
import { DesignerContext } from './managers/types'

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

export interface DesignerOptions {
  id?: string
  initialDiagram?: Partial<Diagram>
  initialViewport?: Partial<Viewport>
}

// ============================================================================
// Helper Functions
// ============================================================================

function createInitialState(options: DesignerOptions): EditorState {
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

export function createDesigner(options: DesignerOptions = {}) {
  const id = options.id || generateId('editor')
  const emitter = createEmitter()

  const initialState = createInitialState(options)
  const [state, setState] = createStore(initialState)
  const ctx: DesignerContext = {
    state,
    setState,
    emit: emitter.emit,
  }

  // managers 分层
  const element = createElementManager(ctx)
  const history = createHistoryManager(ctx)
  const selection = createSelectionManager(ctx, { element })
  const view = createViewManager(ctx, { element })
  const edit = createEditManager(ctx, { element, selection, history })

  const { getById: getElementById, elements } = element
  const page = createMemo(() => state.diagram.page)
  const activeTool = createMemo(() => state.activeTool)

  // function moveElements(
  //   ids: string[],
  //   deltaX: number,
  //   deltaY: number,
  //   options: { recordHistory?: boolean } = {},
  // ): void {
  //   const { recordHistory = true } = options

  //   if (ids.length === 0 || (deltaX === 0 && deltaY === 0)) return

  //   const expandedIds = expandSelectionToGroups(ids)

  //   const previousShapePositions: Record<string, Point> = {}
  //   const previousLinkerState: Record<
  //     string,
  //     {
  //       from: Point
  //       to: Point
  //       points: Array<Point>
  //     }
  //   > = {}

  //   for (const id of expandedIds) {
  //     const element = getElementById(id)
  //     if (!element) continue

  //     if (isShape(element)) {
  //       previousShapePositions[id] = {
  //         x: element.props.x,
  //         y: element.props.y,
  //       }
  //     } else if (isLinker(element)) {
  //       const isFreeLinker = element.from.id === null && element.to.id === null
  //       if (isFreeLinker) {
  //         previousLinkerState[id] = {
  //           from: { x: element.from.x, y: element.from.y },
  //           to: { x: element.to.x, y: element.to.y },
  //           points: element.points.map(p => ({ x: p.x, y: p.y })),
  //         }
  //       }
  //     }
  //   }

  //   const command: Command = {
  //     id: generateId('cmd_move'),
  //     name: `Move ${expandedIds.length} element(s)`,
  //     timestamp: Date.now(),

  //     execute: () => {
  //       for (const id of expandedIds) {
  //         const element = getElementById(id)
  //         if (!element) continue

  //         if (isShape(element)) {
  //           const shape = element as ShapeElement
  //           const updatedShape: ShapeElement = {
  //             ...shape,
  //             props: {
  //               ...shape.props,
  //               x: shape.props.x + deltaX,
  //               y: shape.props.y + deltaY,
  //             },
  //           }
  //           setState('diagram', 'elements', id, updatedShape)
  //         } else if (isLinker(element)) {
  //           const linker = element as LinkerElement
  //           const isFreeLinker = linker.from.id === null && linker.to.id === null
  //           if (isFreeLinker) {
  //             const updatedLinker: LinkerElement = {
  //               ...linker,
  //               from: {
  //                 ...linker.from,
  //                 x: linker.from.x + deltaX,
  //                 y: linker.from.y + deltaY,
  //               },
  //               to: {
  //                 ...linker.to,
  //                 x: linker.to.x + deltaX,
  //                 y: linker.to.y + deltaY,
  //               },
  //               points: linker.points.map(p => ({
  //                 x: p.x + deltaX,
  //                 y: p.y + deltaY,
  //               })),
  //             }
  //             setState('diagram', 'elements', id, updatedLinker)
  //           }
  //         }
  //       }
  //     },

  //     undo: () => {
  //       for (const id in previousShapePositions) {
  //         const element = getElementById(id)
  //         if (!element || !isShape(element)) continue
  //         const shape = element as ShapeElement
  //         const pos = previousShapePositions[id]
  //         const restoredShape: ShapeElement = {
  //           ...shape,
  //           props: {
  //             ...shape.props,
  //             x: pos.x,
  //             y: pos.y,
  //           },
  //         }
  //         setState('diagram', 'elements', id, restoredShape)
  //       }

  //       for (const id in previousLinkerState) {
  //         const element = getElementById(id)
  //         if (!isLinker(element)) continue
  //         const linker = element as LinkerElement
  //         const state = previousLinkerState[id]
  //         const restoredLinker: LinkerElement = {
  //           ...linker,
  //           from: {
  //             ...linker.from,
  //             x: state.from.x,
  //             y: state.from.y,
  //           },
  //           to: {
  //             ...linker.to,
  //             x: state.to.x,
  //             y: state.to.y,
  //           },
  //           points: state.points,
  //         }
  //         setState('diagram', 'elements', id, restoredLinker)
  //       }
  //     },

  //     redo: () => {
  //       command.execute()
  //     },
  //   }

  //   if (recordHistory) {
  //     // history.execute(command)
  //   } else {
  //     command.execute()
  //   }
  // }

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

    const command: Command = {
      id: generateId('cmd_load'),
      name: 'Load diagram',
      timestamp: Date.now(),

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

    const command: Command = {
      id: generateId('cmd_group'),
      name: `Group ${ids.length} elements`,
      timestamp: Date.now(),

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

    const command: Command = {
      id: generateId('cmd_ungroup'),
      name: `Ungroup ${ids.length} elements`,
      timestamp: Date.now(),

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
      // history.execute(command)
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

  function dispose(): void {}

  return {
    id: id,
    // state
    state,

    // managers
    element,
    history,
    selection,
    edit,
    view,

    // 快捷方式
    elements,
    getElementById,
    addElements: edit.add,
    removeElements: edit.remove,
    updateElement: edit.update,
    clearElements: edit.clear,
    moveElements: edit.move,

    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    page,
    activeTool,

    setCanvasSize,
    setTool,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    serialize,
    loadFromJSON,
    group,
    ungroup,
    getGroupShapes,
    isInSameGroup,
    getGroupsFromElements,
    expandSelectionToGroups,
    dispose,
  }
}

export type Designer = ReturnType<typeof createDesigner>

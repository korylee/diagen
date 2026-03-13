import { createStore } from 'solid-js/store'

import { createEmitter, DeepPartial, generateId, pick } from '@diagen/shared'
import type { Viewport } from '../utils'

import { createDiagram, Diagram, DiagramElement } from '../model'
import {
  type Command,
  createEditManager,
  createElementManager,
  createHistoryManager,
  createSelectionManager,
  createViewManager,
} from './managers'
import type { DesignerContext } from './managers/types'
import type { DesignerEmitter, EditorConfig, EditorState } from './types'

export * from './types'

interface DesignerOptions extends DeepPartial<EditorConfig>, DeepPartial<Pick<Diagram, 'id' | 'name' | 'page'>> {
  viewport?: Partial<Viewport>
}

export interface Persistence extends DesignerOptions {}

const DEFAULT_AUTO_GROW_CONFIG = {
  enabled: true,
  growPadding: 240,
  growStep: 200,
  maxWidth: 20000,
  maxHeight: 20000,
  shrink: false,
  shrinkPadding: 320,
}

function createResolvedConfig(options: DesignerOptions): EditorConfig {
  const containerInset = typeof options.containerInset === 'number' ? options.containerInset : 800

  return {
    panelItemWidth: 50,
    panelItemHeight: 50,
    anchorSize: 8,
    rotaterSize: 9,
    anchorColor: '#067bef',
    selectorColor: '#067bef',
    containerInset,
    ...pick(options, [
      'panelItemWidth',
      'panelItemHeight',
      'anchorSize',
      'rotaterSize',
      'anchorColor',
      'selectorColor',
      'containerInset',
    ]),
    autoGrow: {
      ...DEFAULT_AUTO_GROW_CONFIG,
      ...options.autoGrow,
    },
  }
}

function createInitialState(options: DesignerOptions): EditorState {
  const diagram = createDiagram(pick(options, ['id', 'name', 'page']))
  const { width: pageWidth, height: pageHeight } = diagram.page

  return {
    // 持久化储存
    diagram,
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      ...options.viewport,
    },
    viewportSize: {
      width: 800,
      height: 600,
    },
    containerSize: {
      width: pageWidth,
      height: pageHeight,
    },
    config: createResolvedConfig(options),
  }
}

// ============================================================================
// Designer Store Factory Function
// ============================================================================

export function createDesigner(options: DesignerOptions = {}) {
  const id = options.id || generateId('editor')
  const emitter: DesignerEmitter = createEmitter()

  const initialState = createInitialState(options)
  const [state, setState] = createStore(initialState)
  const ctx: DesignerContext = {
    state,
    setState,
    emitter,
  }

  // managers 分层
  const element = createElementManager(ctx)
  const history = createHistoryManager(ctx)
  const selection = createSelectionManager(ctx, { element })
  const view = createViewManager(ctx, { element, selection })
  const edit = createEditManager(ctx, { element, selection, history })

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
    getElementById: element.getById,

    addElements: edit.add,
    removeElements: edit.remove,
    updateElement: edit.update,
    clearElements: edit.clear,
    moveElements: edit.move,

    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    serialize,
    loadFromJSON,
    getGroupShapes,
    isInSameGroup,
    getGroupsFromElements,
    expandSelectionToGroups,
    dispose,
  }
}

export type Designer = ReturnType<typeof createDesigner>

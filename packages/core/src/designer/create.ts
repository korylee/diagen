import { createStore } from 'solid-js/store'

import { createEmitter, DeepPartial, generateId, pick } from '@diagen/shared'
import { LinkerType } from '../constants'
import type { Viewport } from '../utils'

import { createDiagram, Diagram } from '../model'
import {
  type Command,
  createEditManager,
  createElementManager,
  createHistoryManager,
  createSelectionManager,
  createViewManager,
  createGroupManager,
  createClipboardManager,
  createToolManager,
} from './managers'
import type { DesignerContext } from './managers/types'
import type { DesignerEmitter, EditorConfig, EditorState } from './types'

interface DesignerOptions extends DeepPartial<EditorConfig>, DeepPartial<Pick<Diagram, 'id' | 'name' | 'page'>> {
  viewport?: Partial<Viewport>
}

const DEFAULT_AUTO_GROW_CONFIG = {
  enabled: true,
  growPadding: 240,
  growStep: 200,
  maxWidth: 20000,
  maxHeight: 20000,
  shrink: false,
  shrinkPadding: 320,
}

const DEFAULT_LINKER_ROUTE_CONFIG = {
  strategies: {
    [LinkerType.BROKEN]: 'obstacle',
    [LinkerType.ORTHOGONAL]: 'obstacle',
    [LinkerType.STRAIGHT]: 'basic',
    [LinkerType.CURVED]: 'basic',
  },
  obstacleConfig: {
    padding: 15,
  },
  obstacleOptions: {
    algorithm: 'hybrid',
  },
  lineJumpRadius: 10,
} as const

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
    linkerRoute: {
      strategies: {
        ...DEFAULT_LINKER_ROUTE_CONFIG.strategies,
        ...options.linkerRoute?.strategies,
      },
      obstacleConfig: {
        ...DEFAULT_LINKER_ROUTE_CONFIG.obstacleConfig,
        ...options.linkerRoute?.obstacleConfig,
      },
      obstacleOptions: {
        ...DEFAULT_LINKER_ROUTE_CONFIG.obstacleOptions,
        ...options.linkerRoute?.obstacleOptions,
      },
      lineJumpRadius: options.linkerRoute?.lineJumpRadius ?? DEFAULT_LINKER_ROUTE_CONFIG.lineJumpRadius,
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
    tool: {
      type: 'idle',
    },
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
  const group = createGroupManager(ctx, { edit })
  const clipboard = createClipboardManager({ element, selection, group, edit, history })
  const tool = createToolManager(ctx)

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
    group,
    clipboard,
    tool,

    // 快捷方式
    getElementById: element.getElementById,

    addElements: edit.add,
    removeElements: edit.remove,
    updateElement: edit.update,
    clearElements: edit.clear,
    moveElements: edit.move,
    copy: clipboard.copy,
    cut: clipboard.cut,
    paste: clipboard.paste,
    duplicate: clipboard.duplicate,

    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    serialize,
    loadFromJSON,
  }
}

export type Designer = ReturnType<typeof createDesigner>

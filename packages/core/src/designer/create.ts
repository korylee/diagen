import { createStore } from 'solid-js/store'

import { createEmitter, DeepPartial, generateId, pick } from '@diagen/shared'
import { DEFAULTS, LinkerType } from '../constants'
import { unwrapClone } from '../_internal'
import type { Transform } from '../transform'

import { createDiagram } from '../model'
import type { Diagram } from '../model'
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
  transform?: Partial<Transform>
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

function serializeDesignerDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram, null, 2)
}

function loadDesignerDiagram(input: string | Diagram): Diagram {
  // Designer 内部统一在加载时补齐 Diagram 缺省结构，并断开外部引用。
  const raw = typeof input === 'string' ? (JSON.parse(input) as Diagram) : input
  return createDiagram(unwrapClone(raw))
}

function cloneDesignerDiagram(diagram: Diagram): Diagram {
  // 历史记录与 load 回滚都依赖完整快照，统一复用同一份规范化逻辑。
  return loadDesignerDiagram(diagram)
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
  // 当前仍是单页模型，这里直接读取 diagram.page，避免再包一层空访问函数。
  const { width: pageWidth, height: pageHeight } = diagram.page

  return {
    // 持久化储存
    diagram,
    transform: {
      x: 0,
      y: 0,
      zoom: DEFAULTS.DEFAULT_ZOOM,
      ...options.transform,
    },
    viewportSize: {
      width: 800,
      height: 600,
    },
    worldSize: {
      width: pageWidth,
      height: pageHeight,
    },
    // 运行时记录画布原点补偿，后续左/上自动扩展时会基于它做坐标对齐
    originOffset: {
      x: 0,
      y: 0,
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
  const edit = createEditManager(ctx, { element, selection, history, view })
  const group = createGroupManager(ctx, { edit, element, selection })
  const clipboard = createClipboardManager({ element, selection, group, edit, history })
  const tool = createToolManager(ctx)

  function serialize(): string {
    return serializeDesignerDiagram(state.diagram)
  }

  function loadFromJSON(json: string, options: { record?: boolean } = {}): void {
    const { record = false } = options
    const previousDiagram = cloneDesignerDiagram(state.diagram)
    const nextDiagram = loadDesignerDiagram(json)

    const command: Command = {
      id: generateId('cmd_load'),
      name: 'Load diagram',
      timestamp: Date.now(),

      execute: () => {
        // 加载文档按完整 diagram 快照替换，避免只回滚局部字段导致 page/meta 丢失。
        setState('diagram', cloneDesignerDiagram(nextDiagram))
        selection.clear()
      },

      undo: () => {
        // undo 同样恢复完整文档快照，保持 load 前后的根模型一致性。
        setState('diagram', cloneDesignerDiagram(previousDiagram))
        selection.clear()
      },

      redo: () => {
        setState('diagram', cloneDesignerDiagram(nextDiagram))
        selection.clear()
      },
    }

    if (record) {
      history.execute(command)
    } else {
      command.execute()
    }
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
    toFront: edit.toFront,
    toBack: edit.toBack,
    moveForward: edit.moveForward,
    moveBackward: edit.moveBackward,
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

export type { TransactionScope } from './managers'

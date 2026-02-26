import type { StoreContext } from './types'
import { createStore, produce } from 'solid-js/store'
import { createMemo } from 'solid-js'
import { generateId } from '@diagen/shared'

// ==================== 命令接口 ====================

export interface Command {
  id: string
  name: string
  timestamp: number
  execute: () => void
  undo: () => void
  redo: () => void
  canMergeWith?(next: Command): boolean
  merge?(next: Command): Command | null
}

export interface CommandMeta {
  group?: string
  silent?: boolean
  mergeStrategy?: 'replace' | 'append' | 'custom'
}

// ==================== 组合命令 ====================

export class CompositeCommand implements Command {
  readonly id = generateId()
  readonly timestamp = Date.now()
  constructor(
    readonly name: string,
    private commands: Command[] = [],
  ) {}

  execute() {
    this.commands.forEach(cmd => cmd.execute())
  }
  undo() {
    this.commands.reduceRight((_, cmd) => cmd.undo(), null as any)
  }
  redo() {
    this.commands.forEach(cmd => cmd.redo())
  }
  get length() {
    return this.commands.length
  }
}

// ==================== 历史管理器 ====================

export interface HistoryState {
  undoStack: Command[]
  redoStack: Command[]
  maxHistory: number
  mergeWindow: number
  transaction?: { name: string; commands: Command[] }
}

export function createHistoryManager(ctx: StoreContext) {
  const { emit } = ctx

  const [state, setState] = createStore<HistoryState>({
    undoStack: [],
    redoStack: [],
    maxHistory: 50,
    mergeWindow: 300,
  })

  // ==================== 核心状态查询 ====================

  const canUndo = createMemo(() => state.undoStack.length > 0)
  const canRedo = createMemo(() => state.redoStack.length > 0)
  const isInTransaction = createMemo(() => state.transaction !== undefined)
  const undoStack = () => [...state.undoStack]
  const redoStack = () => [...state.redoStack]

  // ==================== 命令合并逻辑 ====================

  function tryMerge(command: Command & CommandMeta): boolean {
    if (command.mergeStrategy === 'append') return false

    const lastCommand = state.undoStack[state.undoStack.length - 1]
    if (!lastCommand) return false

    const now = Date.now()
    const withinWindow = now - lastCommand.timestamp <= state.mergeWindow
    const shouldMerge =
      (command.mergeStrategy === 'replace' && lastCommand.name === command.name) ||
      (command.mergeStrategy === 'custom' && withinWindow)

    if (shouldMerge && lastCommand.canMergeWith?.(command)) {
      const merged = lastCommand.merge?.(command)
      if (merged) {
        setState(
          produce(s => {
            s.undoStack[s.undoStack.length - 1] = merged
          }),
        )
        return true
      }
    }
    return false
  }

  // ==================== 核心操作 ====================

  function pushCommand(command: Command & CommandMeta) {
    if (tryMerge(command)) {
      if (!command.silent) emit('history:execute', command)
      return
    }

    setState(
      produce(s => {
        s.undoStack.push(command)
        if (s.undoStack.length > s.maxHistory) s.undoStack.shift()
        s.redoStack = []
      }),
    )

    if (!command.silent) emit('history:execute', command)
  }

  function execute(command: Command, meta?: CommandMeta) {
    const enrichedCommand = { ...command, ...meta }

    if (state.transaction) {
      state.transaction.commands.push(enrichedCommand)
      enrichedCommand.execute()
      return
    }

    enrichedCommand.execute()
    pushCommand(enrichedCommand)
  }

  function batch(commands: Command[], name = '批量操作', meta?: CommandMeta) {
    if (commands.length === 0) return
    execute(commands.length === 1 ? commands[0] : new CompositeCommand(name, commands), meta)
  }

  // ==================== 事务系统 ====================

  function startTransaction(name = '事务') {
    if (state.transaction) {
      console.warn('事务嵌套不支持')
      return
    }
    setState(
      produce(s => {
        s.transaction = { name, commands: [] }
      }),
    )
    emit('history:transaction-start', { name })
  }

  function commitTransaction() {
    const { transaction } = state
    if (!transaction) return

    setState(
      produce(s => {
        s.transaction = undefined
      }),
    )

    if (transaction.commands.length > 0) {
      pushCommand(new CompositeCommand(transaction.name, transaction.commands))
    }
    emit('history:transaction-commit', { name: transaction.name })
  }

  function rollbackTransaction() {
    const { transaction } = state
    if (!transaction) return

    transaction.commands.reduceRight((_, cmd) => cmd.undo(), null as any)
    setState(
      produce(s => {
        s.transaction = undefined
      }),
    )
    emit('history:transaction-rollback')
  }

  async function transaction<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
    startTransaction(name)
    try {
      const result = await fn()
      commitTransaction()
      return result
    } catch (error) {
      rollbackTransaction()
      throw error
    }
  }

  // ==================== Undo/Redo ====================

  function undo() {
    if (!canUndo()) return

    const command = state.undoStack[state.undoStack.length - 1]
    command.undo()
    setState(
      produce(s => {
        s.undoStack.pop()
        s.redoStack.push(command)
      }),
    )
    emit('history:undo', command)
  }

  function redo() {
    if (!canRedo()) return

    const command = state.redoStack[state.redoStack.length - 1]
    command.redo()
    setState(
      produce(s => {
        s.redoStack.pop()
        s.undoStack.push(command)
      }),
    )
    emit('history:redo', command)
  }

  function clear() {
    setState(
      produce(s => {
        s.undoStack = []
        s.redoStack = []
      }),
    )
    emit('history:clear')
  }

  // ==================== 配置与高级功能 ====================

  function jumpTo(index: number) {
    const target = Math.max(0, Math.min(index, state.undoStack.length - 1))
    const current = state.undoStack.length - 1
    const diff = target - current

    if (diff > 0) {
      for (let i = 0; i < diff && canRedo(); i++) redo()
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff) && canUndo(); i++) undo()
    }
  }

  // ==================== API 暴露 ====================

  return {
    // 状态查询
    state,
    canUndo,
    canRedo,
    isInTransaction,
    undoStack,
    redoStack,

    // 核心操作
    execute,
    batch,
    undo,
    redo,
    clear,

    // 事务系统
    startTransaction,
    commitTransaction,
    rollbackTransaction,
    transaction,

    // 配置
    setMaxHistory: (max: number) =>
      setState(
        produce(s => {
          s.maxHistory = max
          if (s.undoStack.length > max) {
            s.undoStack = s.undoStack.slice(s.undoStack.length - max)
          }
        }),
      ),
    setMergeWindow: (ms: number) => setState('mergeWindow', ms),
    jumpTo,
  }
}

export type HistoryManager = ReturnType<typeof createHistoryManager>

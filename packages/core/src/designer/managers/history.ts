import { generateId, Optional } from '@diagen/shared'
import { createMemo } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { DesignerContext } from './types'

export interface ICommand {
  id: string
  name: string
  timestamp: number
  execute: () => void
  undo: () => void
  redo: () => void
  isNoOp?: boolean
  canMergeWith?(next: ICommand): boolean
  merge?(next: ICommand): ICommand | null
}

export interface CommandMeta {
  mergeKey?: string
  mergeWindow?: number
  [k: string]: any
}

export type Command = ICommand & CommandMeta

export function createCommand<T>(
  opts: Optional<Omit<ICommand, 'id' | 'timestamp'>, 'redo'> & { payload?: T },
): T extends null | undefined ? ICommand : ICommand & { payload: T } {
  const command: any = {
    redo: () => {
      command.execute()
    },
    ...opts,
    id: generateId(opts.name),
    timestamp: Date.now(),
  }
  return command
}

export function createCompositeCommand(name: string, commands: ICommand[]) {
  type CompositeCommand = ICommand & { readonly length: number }

  return {
    name,
    id: generateId(),
    timestamp: Date.now(),
    execute() {
      commands.forEach(cmd => cmd.execute())
    },
    undo() {
      commands.reduceRight((_, cmd) => cmd.undo(), null as any)
    },
    redo() {
      commands.forEach(cmd => cmd.redo())
    },
    get length() {
      return commands.length
    },
  } as CompositeCommand
}

export interface TransactionScope {
  begin: () => boolean
  commit: () => boolean
  abort: () => boolean
  run: <T>(fn: () => Promise<T> | T) => Promise<T>
  isActive: () => boolean
}

export interface HistoryState {
  undoStack: Command[]
  redoStack: Command[]
  maxHistory: number
  mergeWindow: number
  transactions: TransactionFrame[]
}

interface TransactionFrame {
  id: string
  name: string
  commands: Array<Command>
}

export interface HistoryEvents {
  'history:committed': ICommand
  'history:undo': ICommand
  'history:redo': ICommand
  'history:clear': void
}

function shouldMergeCommand(params: {
  lastCommand?: Command
  nextCommand: Command
  mergeWindow: number
  now?: number
}): boolean {
  const { lastCommand, nextCommand, mergeWindow, now = Date.now() } = params

  if (!lastCommand || !lastCommand.mergeKey || !nextCommand.mergeKey) return false

  const resolvedMergeWindow = nextCommand.mergeWindow ?? lastCommand.mergeWindow ?? mergeWindow
  const withinWindow = now - lastCommand.timestamp <= resolvedMergeWindow

  return nextCommand.mergeKey === lastCommand.mergeKey && withinWindow
}

function getLast<T>(list: T[]) {
  return list[list.length - 1]
}

export function createHistoryManager(ctx: DesignerContext) {
  const { emit } = ctx.emitter

  const [state, setState] = createStore<HistoryState>({
    undoStack: [],
    redoStack: [],
    maxHistory: 50,
    mergeWindow: 300,
    transactions: [],
  })

  function updateHistoryState(recipe: (state: HistoryState) => void): void {
    setState(produce(recipe))
  }

  function enrichCommand<T extends ICommand>(command: T, meta?: CommandMeta): T & CommandMeta {
    if (!meta) return command as T & CommandMeta

    return Object.assign(Object.create(Object.getPrototypeOf(command)), command, meta)
  }

  // ==================== 核心状态查询 ====================

  const canUndo = createMemo(() => state.undoStack.length > 0)
  const canRedo = createMemo(() => state.redoStack.length > 0)
  const isInTransaction = createMemo(() => state.transactions.length > 0)
  const undoStack = () => [...state.undoStack]
  const redoStack = () => [...state.redoStack]

  function createTransactionCommand(name: string, commands: Command[]): ICommand | null {
    if (commands.length === 0) return null
    return commands.length === 1 ? commands[0] : createCompositeCommand(name, commands)
  }

  // ==================== 命令合并逻辑 ====================

  function tryMerge(command: Command): ICommand | null {
    const lastCommand = state.undoStack[state.undoStack.length - 1]
    if (
      !shouldMergeCommand({
        lastCommand,
        nextCommand: command,
        mergeWindow: state.mergeWindow,
      })
    ) {
      return null
    }

    if (lastCommand.canMergeWith?.(command)) {
      const merged = lastCommand.merge?.(command) as Command
      if (merged) {
        const mergedCommand = enrichCommand(merged, {
          mergeKey: merged.mergeKey ?? command.mergeKey ?? lastCommand.mergeKey,
          mergeWindow: merged.mergeWindow ?? command.mergeWindow ?? lastCommand.mergeWindow,
        })
        updateHistoryState(s => {
          s.undoStack[s.undoStack.length - 1] = mergedCommand
        })
        return mergedCommand
      }
    }
    return null
  }

  // ==================== 核心操作 ====================

  function pushCommand(command: Command) {
    const mergedCommand = tryMerge(command)
    if (mergedCommand) {
      emit('history:committed', mergedCommand)
      return
    }

    updateHistoryState(s => {
      s.undoStack.push(command)
      if (s.undoStack.length > s.maxHistory) s.undoStack.shift()
      s.redoStack = []
    })

    emit('history:committed', command)
  }

  function execute(command: ICommand, meta?: CommandMeta) {
    if (command.isNoOp) return
    const enrichedCommand = enrichCommand(command, meta)
    const activeTransaction = getLast(state.transactions)

    if (activeTransaction) {
      enrichedCommand.execute()
      updateHistoryState(s => {
        const transaction = getLast(s.transactions)
        transaction?.commands.push(enrichedCommand)
      })
      return
    }

    enrichedCommand.execute()
    pushCommand(enrichedCommand)
  }

  function batch(commands: ICommand[], name = '批量操作', meta?: CommandMeta) {
    const transaction = createTransactionCommand(name, commands)
    if (!transaction) return
    execute(transaction, meta)
  }

  // ==================== 事务系统 ====================

  function startTransaction(name = '事务'): string | null {
    const id = generateId()
    updateHistoryState(s => {
      s.transactions.push({ id, name, commands: [] })
    })
    return id
  }

  function commitTransaction(transactionId?: string): boolean {
    const transaction = getLast(state.transactions)
    if (!transaction) return false
    if (transactionId && transaction.id !== transactionId) return false

    const command = createTransactionCommand(transaction.name, transaction.commands)
    const hasParentTransaction = state.transactions.length > 1

    updateHistoryState(s => {
      s.transactions.pop()
      if (command && hasParentTransaction) {
        const transaction = getLast(s.transactions)
        transaction?.commands.push(command)
      }
    })

    if (command && !hasParentTransaction) {
      pushCommand(command)
    }
    return true
  }

  function abortTransaction(transactionId?: string): boolean {
    const transaction = getLast(state.transactions)
    if (!transaction) return false
    if (transactionId && transaction.id !== transactionId) return false

    transaction.commands.reduceRight((_, cmd) => cmd.undo(), null as any)
    updateHistoryState(s => {
      s.transactions.pop()
    })
    return true
  }

  function createTransactionScope(name = '事务'): TransactionScope {
    let transactionId: string | null = null

    const begin = (): boolean => {
      if (transactionId) return false
      const id = startTransaction(name)
      if (!id) return false
      transactionId = id
      return true
    }

    const commit = (): boolean => {
      if (!transactionId) return false
      const ok = commitTransaction(transactionId)
      if (ok) transactionId = null
      return ok
    }

    const abort = (): boolean => {
      if (!transactionId) return false
      const ok = abortTransaction(transactionId)
      if (ok) transactionId = null
      return ok
    }

    const run = async <T>(fn: () => Promise<T> | T): Promise<T> => {
      if (!begin()) {
        throw new Error('事务作用域已开始')
      }

      try {
        const result = await fn()
        commit()
        return result
      } catch (error) {
        abort()
        throw error
      }
    }

    const isActive = (): boolean => transactionId !== null

    return {
      begin,
      commit,
      abort,
      run,
      isActive,
    }
  }

  // ==================== Undo/Redo ====================

  function undo() {
    if (isInTransaction()) return
    if (!canUndo()) return

    const command = getLast(state.undoStack)
    command.undo()
    updateHistoryState(s => {
      s.undoStack.pop()
      s.redoStack.push(command)
    })
    emit('history:undo', command)
  }

  function redo() {
    if (isInTransaction()) return
    if (!canRedo()) return

    const command = getLast(state.redoStack)
    command.redo()
    updateHistoryState(s => {
      s.redoStack.pop()
      s.undoStack.push(command)
    })
    emit('history:redo', command)
  }

  function clear() {
    if (isInTransaction()) return
    updateHistoryState(s => {
      s.undoStack = []
      s.redoStack = []
    })
    emit('history:clear')
  }

  function move(position: number): void {
    if (isInTransaction()) return
    const total = state.undoStack.length + state.redoStack.length
    const target = Math.max(0, Math.min(position, total))
    const current = state.undoStack.length
    const diff = target - current

    if (diff > 0) {
      for (let i = 0; i < diff && canRedo(); i++) redo()
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff) && canUndo(); i++) undo()
    }
  }

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
    createScope: createTransactionScope,

    // 配置
    setMaxHistory: (max: number) =>
      updateHistoryState(s => {
        s.maxHistory = max
        if (s.undoStack.length > max) {
          s.undoStack = s.undoStack.slice(s.undoStack.length - max)
        }
      }),
    setMergeWindow: (ms: number) => setState('mergeWindow', ms),
    move,
  }
}

export type HistoryManager = ReturnType<typeof createHistoryManager>

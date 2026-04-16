import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createEmitter } from '@diagen/shared'
import { createDesigner } from '../create'
import { type Command, createCommand, createHistoryManager } from './history'

function withDesigner(run: (designer: ReturnType<typeof createDesigner>) => void) {
  createRoot(dispose => {
    const designer = createDesigner()
    try {
      run(designer)
    } finally {
      dispose()
    }
  })
}

function withHistory(
  run: (history: ReturnType<typeof createHistoryManager>, emitter: ReturnType<typeof createEmitter>) => void,
) {
  createRoot(dispose => {
    const emitter = createEmitter()
    const history = createHistoryManager({ emitter } as any)
    try {
      run(history, emitter)
    } finally {
      dispose()
    }
  })
}

function createDeltaCommand(name: string, counter: { value: number }, delta: number): Command {
  return createCommand({
    name,
    execute() {
      counter.value += delta
    },
    undo() {
      counter.value -= delta
    },
  })
}

function createMergeCommand(counter: { value: number }, delta: number) {
  let command: Command & { payload: { delta: number } }
  command = createCommand({
    name: 'merge_delta',
    payload: { delta },
    execute() {
      counter.value += command.payload.delta
    },
    undo() {
      counter.value -= command.payload.delta
    },
    canMergeWith(next: Command) {
      return next.name === 'merge_delta'
    },
    merge(next: Command) {
      command.payload.delta += (next as any).payload.delta
      return command
    },
  }) as Command & { payload: { delta: number } }
  return command
}

describe('history manager', () => {
  it('history:committed', () => {
    withHistory((history, emitter) => {
      const counter = { value: 0 }
      const committed: string[] = []
      const replayed: Array<'undo' | 'redo'> = []

      emitter.on('history:committed', command => {
        committed.push(command.name)
      })

      emitter.on('history:redo', command => {
        replayed.push('redo')
      })
      emitter.on('history:undo', command => {
        replayed.push('undo')
      })
      history.execute(createDeltaCommand('plus_one', counter, 1))
      const txId = history.transaction.begin('批量变更')
      expect(txId).not.toBeNull()

      history.execute(createDeltaCommand('add_1', counter, 1))
      history.execute(createDeltaCommand('add_2', counter, 2))
      history.transaction.commit(txId || undefined)

      history.undo()
      history.redo()

      expect(committed).toEqual(['plus_one', '批量变更'])
      expect(replayed).toEqual(['undo', 'redo'])
    })
  })

  it('execute/undo/redo 应正确维护计数与栈状态', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(createDeltaCommand('plus_one', counter, 1))

      expect(counter.value).toBe(1)
      expect(designer.history.canUndo()).toBe(true)
      expect(designer.history.canRedo()).toBe(false)

      designer.history.undo()
      expect(counter.value).toBe(0)
      expect(designer.history.canRedo()).toBe(true)

      designer.history.redo()
      expect(counter.value).toBe(1)
    })
  })

  it('isNoOp 命令不应执行且不应入栈', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(
        createCommand({
          name: 'noop',
          isNoOp: true,
          execute() {
            counter.value += 1
          },
          undo() {
            counter.value -= 1
          },
        }),
      )

      expect(counter.value).toBe(0)
      expect(designer.history.canUndo()).toBe(false)
    })
  })

  it('replace 合并策略应将同类命令合并为一个历史项', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(createMergeCommand(counter, 1), { mergeStrategy: 'replace' })
      designer.history.execute(createMergeCommand(counter, 2), { mergeStrategy: 'replace' })

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)
    })
  })

  it('append 合并策略不应触发命令合并', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(createMergeCommand(counter, 1), { mergeStrategy: 'append' })
      designer.history.execute(createMergeCommand(counter, 2), { mergeStrategy: 'append' })

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(2)
    })
  })

  it('事务 commit 应生成一个组合命令，undo 可整体回退', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const txId = designer.history.transaction.begin('批量变更')
      expect(txId).not.toBeNull()

      designer.history.execute(createDeltaCommand('add_1', counter, 1))
      designer.history.execute(createDeltaCommand('add_2', counter, 2))

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(0)

      designer.history.transaction.commit(txId || undefined)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)
    })
  })

  it('事务 abort 应回滚已执行命令且不写入历史栈', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const txId = designer.history.transaction.begin('回滚测试')
      expect(txId).not.toBeNull()

      designer.history.execute(createDeltaCommand('add_1', counter, 1))
      designer.history.execute(createDeltaCommand('add_2', counter, 2))
      expect(counter.value).toBe(3)

      designer.history.transaction.abort(txId || undefined)
      expect(counter.value).toBe(0)
      expect(designer.history.undoStack().length).toBe(0)
    })
  })

  it('setMaxHistory 与 move 应按时间线位置跳转', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.setMaxHistory(2)

      designer.history.execute(createDeltaCommand('add_1', counter, 1))
      designer.history.execute(createDeltaCommand('add_2', counter, 1))
      designer.history.execute(createDeltaCommand('add_3', counter, 1))

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(2)

      designer.history.move(0)
      expect(counter.value).toBe(1)
      expect(designer.history.canRedo()).toBe(true)

      designer.history.move(2)
      expect(counter.value).toBe(3)
      expect(designer.history.canUndo()).toBe(true)
    })
  })
})

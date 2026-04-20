import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createEmitter } from '@diagen/shared'
import { createShape, type ShapeElement } from '../../model'
import { createDesigner } from '../create'
import { type ICommand, createCommand, createHistoryManager } from './history'

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

function createDeltaCommand(name: string, counter: { value: number }, delta: number): ICommand {
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
  let command: ICommand & { payload: { delta: number } }
  command = createCommand({
    name: 'merge_delta',
    payload: { delta },
    execute() {
      counter.value += command.payload.delta
    },
    undo() {
      counter.value -= command.payload.delta
    },
    canMergeWith(next: ICommand) {
      return next.name === 'merge_delta'
    },
    merge(next: ICommand) {
      command.payload.delta += (next as any).payload.delta
      return command
    },
  }) as ICommand & { payload: { delta: number } }
  return command
}

function createContainerShape(id: string) {
  return createShape({
    id,
    name: id,
    group: null,
    attribute: {
      ...createShape({}).attribute,
      container: true,
    },
    props: { x: 0, y: 0, w: 260, h: 180, angle: 0 },
  })
}

function createBasicShape(id: string, x: number, y: number) {
  return createShape({
    id,
    name: id,
    group: null,
    props: { x, y, w: 80, h: 60, angle: 0 },
  })
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
      const transaction = history.createScope('批量变更')
      expect(transaction.begin()).toBe(true)

      history.execute(createDeltaCommand('add_1', counter, 1))
      history.execute(createDeltaCommand('add_2', counter, 2))
      expect(transaction.commit()).toBe(true)

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

  it('mergeKey 相同的命令应合并为一个历史项', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(createMergeCommand(counter, 1), { mergeKey: 'counter:delta' })
      designer.history.execute(createMergeCommand(counter, 2), { mergeKey: 'counter:delta' })

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)
    })
  })

  it('未提供 mergeKey 的命令不应触发命令合并', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      designer.history.execute(createMergeCommand(counter, 1))
      designer.history.execute(createMergeCommand(counter, 2))

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(2)
    })
  })

  it('事务 commit 应生成一个组合命令，undo 可整体回退', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const transaction = designer.history.createScope('批量变更')
      expect(transaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('add_1', counter, 1))
      designer.history.execute(createDeltaCommand('add_2', counter, 2))

      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(0)

      expect(transaction.commit()).toBe(true)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)
    })
  })

  it('事务 abort 应回滚已执行命令且不写入历史栈', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const transaction = designer.history.createScope('回滚测试')
      expect(transaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('add_1', counter, 1))
      designer.history.execute(createDeltaCommand('add_2', counter, 2))
      expect(counter.value).toBe(3)

      expect(transaction.abort()).toBe(true)
      expect(counter.value).toBe(0)
      expect(designer.history.undoStack().length).toBe(0)
    })
  })

  it('嵌套事务 commit 后应在根事务提交时统一入栈', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const rootTransaction = designer.history.createScope('根事务')
      expect(rootTransaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('root_add', counter, 1))

      const childTransaction = designer.history.createScope('子事务')
      expect(childTransaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('child_add', counter, 2))
      expect(counter.value).toBe(3)
      expect(designer.history.undoStack().length).toBe(0)

      expect(childTransaction.commit()).toBe(true)
      expect(designer.history.undoStack().length).toBe(0)
      expect(designer.history.isInTransaction()).toBe(true)

      expect(rootTransaction.commit()).toBe(true)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)

      designer.history.redo()
      expect(counter.value).toBe(3)
    })
  })

  it('嵌套事务 abort 只应回滚当前子事务，并允许父事务继续提交', () => {
    withDesigner(designer => {
      const counter = { value: 0 }
      const rootTransaction = designer.history.createScope('根事务')
      expect(rootTransaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('root_add', counter, 1))

      const childTransaction = designer.history.createScope('子事务')
      expect(childTransaction.begin()).toBe(true)

      designer.history.execute(createDeltaCommand('child_add', counter, 2))
      expect(counter.value).toBe(3)

      expect(childTransaction.abort()).toBe(true)
      expect(counter.value).toBe(1)
      expect(designer.history.isInTransaction()).toBe(true)

      designer.history.execute(createDeltaCommand('root_add_more', counter, 3))
      expect(counter.value).toBe(4)

      expect(rootTransaction.commit()).toBe(true)
      expect(designer.history.undoStack().length).toBe(1)

      designer.history.undo()
      expect(counter.value).toBe(0)
    })
  })

  it('容器事务 commit 后应作为一个 undo 单元回滚 parent、children 与几何', () => {
    withDesigner(designer => {
      const container = createContainerShape('history_container_commit')
      const shape = createBasicShape('history_shape_commit', 320, 40)
      designer.edit.add([container, shape], { record: false, select: false })
      designer.selection.replace([shape.id])

      const transaction = designer.history.createScope('容器事务提交')
      expect(transaction.begin()).toBe(true)

      designer.edit.update(shape.id, 'props', 'x', 60)
      designer.edit.parenting([shape.id])

      expect(designer.history.undoStack().length).toBe(0)
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(60)
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shape.id])

      expect(transaction.commit()).toBe(true)
      expect(designer.history.undoStack().length).toBe(1)
      expect(designer.selection.selectedIds()).toEqual([shape.id])

      designer.undo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(320)
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBeNull()
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([])
      expect(designer.selection.selectedIds()).toEqual([shape.id])

      designer.redo()
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(60)
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shape.id])
      expect(designer.selection.selectedIds()).toEqual([shape.id])
    })
  })

  it('容器事务 abort 后应回滚 parent、children 与几何，且不写入历史', () => {
    withDesigner(designer => {
      const container = createContainerShape('history_container_abort')
      const shape = createBasicShape('history_shape_abort', 320, 40)
      designer.edit.add([container, shape], { record: false, select: false })
      designer.selection.replace([shape.id])

      const transaction = designer.history.createScope('容器事务回滚')
      expect(transaction.begin()).toBe(true)

      designer.edit.update(shape.id, 'props', 'x', 60)
      designer.edit.parenting([shape.id])

      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(60)
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBe(container.id)
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([shape.id])

      expect(transaction.abort()).toBe(true)
      expect(designer.history.undoStack().length).toBe(0)
      expect(designer.getElementById<ShapeElement>(shape.id)?.props.x).toBe(320)
      expect(designer.getElementById<ShapeElement>(shape.id)?.parent).toBeNull()
      expect(designer.getElementById<ShapeElement>(container.id)?.children).toEqual([])
      expect(designer.selection.selectedIds()).toEqual([shape.id])
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

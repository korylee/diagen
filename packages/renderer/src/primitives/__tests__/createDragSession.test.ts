import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'
import { createDragSession } from '../createDragSession'

function createMouseEvent(x: number, y: number): MouseEvent {
  return {
    clientX: x,
    clientY: y,
  } as MouseEvent
}

function createTransactionMock() {
  return {
    begin: vi.fn(() => true),
    commit: vi.fn(() => true),
    abort: vi.fn(() => true),
  }
}

describe('createDragSession', () => {
  it('on-begin 模式下 setup 失败时应回滚事务', () => {
    createRoot(dispose => {
      const transaction = createTransactionMock()
      const session = createDragSession<{ event: MouseEvent }, { id: string }>({
        threshold: 3,
        transaction,
        transactionMode: 'on-begin',
        getEvent: input => input.event,
        setup: () => null,
        update: () => {},
      })

      expect(session.begin({ event: createMouseEvent(0, 0) })).toBe(false)
      expect(transaction.begin).toHaveBeenCalledTimes(1)
      expect(transaction.abort).toHaveBeenCalledTimes(1)
      expect(transaction.commit).not.toHaveBeenCalled()
      expect(session.state()).toBeNull()

      dispose()
    })
  })

  it('on-begin 模式下未越过阈值时 end 应中止事务', () => {
    createRoot(dispose => {
      const transaction = createTransactionMock()
      const onAbort = vi.fn()
      const session = createDragSession<{ event: MouseEvent }, { id: string }>({
        threshold: 3,
        transaction,
        transactionMode: 'on-begin',
        getEvent: input => input.event,
        setup: () => ({ id: 'drag-session' }),
        update: () => {},
        onAbort,
      })

      expect(session.begin({ event: createMouseEvent(0, 0) })).toBe(true)

      session.end()

      expect(transaction.begin).toHaveBeenCalledTimes(1)
      expect(transaction.abort).toHaveBeenCalledTimes(1)
      expect(transaction.commit).not.toHaveBeenCalled()
      expect(onAbort).toHaveBeenCalledTimes(1)
      expect(session.state()).toBeNull()

      dispose()
    })
  })

  it('on-drag-start 模式下应在真正开始拖拽后才开启事务', () => {
    createRoot(dispose => {
      const transaction = createTransactionMock()
      const update = vi.fn()
      const onCommit = vi.fn()
      const session = createDragSession<{ event: MouseEvent }, { id: string }>({
        threshold: 3,
        transaction,
        transactionMode: 'on-drag-start',
        getEvent: input => input.event,
        setup: () => ({ id: 'drag-session' }),
        update,
        onCommit,
      })

      expect(session.begin({ event: createMouseEvent(0, 0) })).toBe(true)
      expect(transaction.begin).not.toHaveBeenCalled()

      session.move(createMouseEvent(2, 2))

      expect(transaction.begin).not.toHaveBeenCalled()
      expect(update).not.toHaveBeenCalled()

      session.move(createMouseEvent(4, 0))
      session.end()

      expect(transaction.begin).toHaveBeenCalledTimes(1)
      expect(transaction.commit).toHaveBeenCalledTimes(1)
      expect(transaction.abort).not.toHaveBeenCalled()
      expect(update).toHaveBeenCalledTimes(1)
      expect(onCommit).toHaveBeenCalledTimes(1)

      dispose()
    })
  })
})

import { createSignal } from 'solid-js'
import type { Point } from '@diagen/shared'
import { createDragSession, type CreateDragSessionOptions, type DragMoveState } from './createDragSession'

interface TransactionScopeLike {
  begin: () => boolean
  commit: () => boolean
  abort: () => boolean
}

export interface CreateTransactionalSessionOptions extends CreateDragSessionOptions {
  transaction: TransactionScopeLike
  onCommit?: () => void
  onAbort?: () => void
}

/**
 * 事务化拖拽会话：
 * - threshold / pending / dragging 由 createDragSession 负责
 * - 事务在首次跨过阈值时开启，结束时自动 commit/abort
 */
export function createTransactionalSession(options: CreateTransactionalSessionOptions) {
  const { transaction, onCommit, onAbort, threshold = 3 } = options
  const session = createDragSession({ threshold })
  const [transactionStarted, setTransactionStarted] = createSignal<boolean>(false)

  function begin(point: Point): void {
    setTransactionStarted(false)
    session.begin(point)
  }

  function update(point: Point): DragMoveState | null {
    const moveState = session.update(point)
    if (!moveState || !moveState.shouldUpdate) return moveState

    if (!transactionStarted()) {
      if (!transaction.begin()) {
        session.cancel()
        return null
      }
      setTransactionStarted(true)
    }

    return moveState
  }

  function finish(): boolean {
    if (!session.isPending()) return false
    const dragged = session.finish()
    finalizeTransaction(dragged)
    return dragged
  }

  function cancel(): void {
    if (!session.isPending()) return
    session.cancel()
    finalizeTransaction(false)
  }

  function finalizeTransaction(shouldCommit: boolean): void {
    if (!transactionStarted()) return

    if (shouldCommit) {
      if (transaction.commit()) {
        onCommit?.()
      } else {
        onAbort?.()
      }
    } else {
      if (transaction.abort()) {
        onAbort?.()
      }
    }
    setTransactionStarted(false)
  }

  return {
    isDragging: session.isDragging,
    isPending: session.isPending,
    delta: session.delta,
    begin,
    update,
    finish,
    cancel,
  }
}

export type CreateTransactionalSession = ReturnType<typeof createTransactionalSession>

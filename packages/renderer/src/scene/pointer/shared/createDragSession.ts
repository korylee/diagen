import { createSignal } from 'solid-js'
import {
  createPointerDragTracker,
  type CreatePointerDragTrackerOptions,
  type PointerDragMoveState,
} from './createPointerDragTracker'
import { TransactionScope } from '@diagen/core/designer'

interface BaseTStartInput {
  event: {
    clientX: number
    clientY: number
  }
}

export type DragTransactionMode = 'on-begin' | 'on-drag-start'

export interface DragSessionUpdateContext<TState> {
  state: TState
  event: MouseEvent
  moveState: PointerDragMoveState
}

export interface DragSessionFinalizeContext<TState> {
  state: TState | null
  shouldCommit: boolean
  reason: 'end' | 'cancel'
}

export interface CreateDragSessionOptions<TStartInput, TState> extends CreatePointerDragTrackerOptions {
  setup: (input: TStartInput) => TState | null
  update: (context: DragSessionUpdateContext<TState>) => void
  finalize?: (context: DragSessionFinalizeContext<TState>) => void
  reset?: () => void
  transaction?: Pick<TransactionScope, 'begin' | 'commit' | 'abort'>
  transactionMode?: DragTransactionMode
  onCommit?: (state: TState | null) => void
  onAbort?: (state: TState | null) => void
}

export function createDragSession<TStartInput extends BaseTStartInput, TState>(
  options: CreateDragSessionOptions<TStartInput, TState>,
) {
  const {
    threshold = 3,
    setup,
    update,
    finalize,
    reset,
    transaction,
    transactionMode = 'on-drag-start',
    onCommit,
    onAbort,
  } = options

  const tracker = createPointerDragTracker({ threshold })
  const [state, setState] = createSignal<TState | null>(null)
  let transactionStarted = false

  function begin(input: TStartInput): boolean {
    if (transaction && transactionMode === 'on-begin') {
      if (!startTransaction()) {
        resetSession()
        return false
      }
    }

    try {
      const nextState = setup(input)
      if (!nextState) {
        abortStartedTransaction()
        resetSession()
        return false
      }

      setState(() => nextState)
      const event = input.event
      tracker.begin({ x: event.clientX, y: event.clientY })
      return true
    } catch (error) {
      abortStartedTransaction()
      resetSession()
      throw error
    }
  }

  function move(event: MouseEvent): void {
    const moveState = tracker.update({ x: event.clientX, y: event.clientY })
    const currentState = state()
    if (!moveState || !moveState.shouldUpdate || !currentState) return

    if (transaction && !transactionStarted && transactionMode === 'on-drag-start') {
      if (!startTransaction()) {
        cancel()
        return
      }
    }

    update({
      state: currentState,
      event,
      moveState,
    })
  }

  function end(): void {
    if (!tracker.isPending()) return
    const currentState = state()
    const shouldCommit = tracker.finish()

    finalize?.({
      state: currentState,
      shouldCommit,
      reason: 'end',
    })

    finalizeTransaction(shouldCommit, currentState)
    resetSession()
  }

  function cancel(): void {
    if (!tracker.isPending()) return
    const currentState = state()
    tracker.cancel()

    finalize?.({
      state: currentState,
      shouldCommit: false,
      reason: 'cancel',
    })

    finalizeTransaction(false, currentState)
    resetSession()
  }

  function finalizeTransaction(shouldCommit: boolean, currentState: TState | null): void {
    if (!transactionStarted) {
      notifyTransactionResult(shouldCommit, currentState)
      return
    }

    if (!transaction) {
      notifyTransactionResult(shouldCommit, currentState)
      transactionStarted = false
      return
    }

    if (shouldCommit) {
      if (transaction.commit()) {
        onCommit?.(currentState)
      } else {
        onAbort?.(currentState)
      }
    } else {
      if (transaction.abort()) {
        onAbort?.(currentState)
      }
    }
    transactionStarted = false
  }

  function startTransaction(): boolean {
    if (!transaction) return true
    if (transactionStarted) return false

    const started = transaction.begin()
    transactionStarted = started
    return started
  }

  function abortStartedTransaction(): void {
    if (!transactionStarted || !transaction) return
    transaction.abort()
    transactionStarted = false
  }

  function notifyTransactionResult(shouldCommit: boolean, currentState: TState | null): void {
    if (shouldCommit) {
      onCommit?.(currentState)
      return
    }

    onAbort?.(currentState)
  }

  function resetSession(): void {
    setState(() => null)
    transactionStarted = false
    reset?.()
  }

  return {
    state,
    isPending: tracker.isPending,
    isDragging: tracker.isDragging,
    isActive: tracker.isPending,
    delta: tracker.delta,
    begin,
    move,
    end,
    cancel,
  }
}

export type CreateDragSession<TStartInput extends BaseTStartInput, TState> = ReturnType<
  typeof createDragSession<TStartInput, TState>
>

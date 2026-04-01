import { createRoot } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRafMergeQueue } from './shared'

function createFrameScheduler() {
  let nextId = 1
  const callbacks = new Map<number, FrameRequestCallback>()

  return {
    request: vi.fn((callback: FrameRequestCallback) => {
      const id = nextId++
      callbacks.set(id, callback)
      return id
    }),
    cancel: vi.fn((id: number) => {
      callbacks.delete(id)
    }),
    pending: () => callbacks.size,
    runNext: (time = 0) => {
      const next = callbacks.entries().next()
      if (next.done) return false

      const [id, callback] = next.value
      callbacks.delete(id)
      callback(time)
      return true
    },
  }
}

function withQueue<R>(
  run: (context: {
    queue: ReturnType<typeof createRafMergeQueue<number, R>>
    scheduler: ReturnType<typeof createFrameScheduler>
    effect: ReturnType<typeof vi.fn>
  }) => void | Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    createRoot(dispose => {
      const scheduler = createFrameScheduler()
      vi.stubGlobal('requestAnimationFrame', scheduler.request)
      vi.stubGlobal('cancelAnimationFrame', scheduler.cancel)

      const effect = vi.fn((payload?: number) => payload as R)
      const queue = createRafMergeQueue<number, R>({
        merge: (prev, next) => prev + next,
        run: effect,
      })

      Promise.resolve(run({ queue, scheduler, effect })).then(
        () => {
          dispose()
          resolve()
        },
        error => {
          dispose()
          reject(error)
        },
      )
    })
  })
}

describe('view shared createRafMergeQueue', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('enqueue 应在同一帧内合并 payload 并只执行一次', () => {
    return withQueue<number | undefined>(({ queue, scheduler, effect }) => {
      queue.enqueue(1)
      queue.enqueue(2)
      queue.enqueue(3)

      expect(scheduler.request).toHaveBeenCalledTimes(1)
      expect(scheduler.pending()).toBe(1)

      scheduler.runNext()
      expect(effect).toHaveBeenCalledTimes(1)
      expect(effect).toHaveBeenCalledWith(6)
      expect(scheduler.pending()).toBe(0)
    })
  })

  it('flush 应取消挂起帧并立即返回执行结果', () => {
    return withQueue<number>(({ queue, scheduler, effect }) => {
      effect.mockImplementation((payload?: number) => (payload ?? 0) * 10)

      queue.enqueue(2)
      const result = queue.flush(3)

      expect(scheduler.cancel).toHaveBeenCalledTimes(1)
      expect(effect).toHaveBeenCalledTimes(1)
      expect(effect).toHaveBeenCalledWith(5)
      expect(result).toBe(50)
      expect(scheduler.pending()).toBe(0)
    })
  })

  it('undefined payload 不应参与 merge，但仍应允许执行 run(undefined)', () => {
    return withQueue<number | undefined>(({ queue, scheduler, effect }) => {
      queue.enqueue()

      expect(scheduler.request).toHaveBeenCalledTimes(1)

      scheduler.runNext()
      expect(effect).toHaveBeenCalledTimes(1)
      expect(effect).toHaveBeenCalledWith(undefined)
    })
  })
})

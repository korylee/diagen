export function createSingletonPromise<T>(fn: () => Promise<T>) {
  let _promise: Promise<T> | undefined

  function wrapper() {
    if (!_promise) _promise = fn()
    return _promise
  }
  wrapper.reset = function () {
    const _prev = _promise
    _promise = undefined
    return _prev
  }
  return wrapper
}

export function createRafMergeQueue<T, R>(options: { merge: (prev: T, next: T) => T; run: (payload?: T) => R }) {
  let frameId: number | null = null
  let pending: T | undefined

  const mergePending = (payload?: T) => {
    if (payload === undefined) return
    pending = pending === undefined ? payload : options.merge(pending, payload)
  }

  const flush = (payload?: T): R => {
    mergePending(payload)

    if (frameId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(frameId)
      }
      frameId = null
    }

    const queued = pending
    pending = undefined
    return options.run(queued)
  }

  const enqueue = (payload?: T): void => {
    mergePending(payload)
    if (frameId !== null) return

    if (typeof requestAnimationFrame !== 'function') {
      flush()
      return
    }

    frameId = requestAnimationFrame(() => {
      frameId = null
      const queued = pending
      pending = undefined
      options.run(queued)
    })
  }

  return {
    enqueue,
    flush,
  }
}

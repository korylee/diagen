export function memoizePromise<T>(fn: () => Promise<T>) {
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

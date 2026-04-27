export function createLRU<T, R>(max: number, cache: Map<T, R> = new Map()) {
  const has = (key: T) => cache.has(key)
  const get = (key: T) => {
    if (!has(key)) return undefined
    const temp = cache.get(key) as R
    cache.delete(key)
    cache.set(key, temp)
    return temp
  }
  const put = (key: T, value: R) => {
    if (has(key)) cache.delete(key)
    else if (cache.size >= max) {
      const key = cache.keys().next().value
      key && cache.delete(key)
    }
    cache.set(key, value)
  }
  const clear = () => cache.clear()
  const keys = () => cache.keys()
  const deleteItem = (key: T) => cache.delete(key)

  return {
    has,
    get,
    put,
    clear,
    keys,
    delete: deleteItem,
    get size() {
      return cache.size
    },
  }
}

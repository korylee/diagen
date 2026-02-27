export interface MinHeap<T> {
  push: (item: T) => void
  pop: () => T | undefined
  peek: () => T | undefined
  readonly length: number
}

export function createMinHeap<T>(scoreFn: (item: T) => number): MinHeap<T> {
  const heap: T[] = []

  const bubbleUp = (index: number): void => {
    let i = index
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (scoreFn(heap[i]) >= scoreFn(heap[parent])) break
      ;[heap[i], heap[parent]] = [heap[parent], heap[i]]
      i = parent
    }
  }

  const bubbleDown = (index: number): void => {
    let i = index
    const length = heap.length
    while (true) {
      const left = 2 * i + 1
      const right = 2 * i + 2
      let smallest = i

      if (left < length && scoreFn(heap[left]) < scoreFn(heap[smallest])) {
        smallest = left
      }
      if (right < length && scoreFn(heap[right]) < scoreFn(heap[smallest])) {
        smallest = right
      }
      if (smallest === i) break
      ;[heap[i], heap[smallest]] = [heap[smallest], heap[i]]
      i = smallest
    }
  }

  const push = (item: T): void => {
    heap.push(item)
    bubbleUp(heap.length - 1)
  }

  const pop = (): T | undefined => {
    if (heap.length === 0) return undefined
    const top = heap[0]
    const bottom = heap.pop()!
    if (heap.length > 0) {
      heap[0] = bottom
      bubbleDown(0)
    }
    return top
  }

  const peek = (): T | undefined => heap[0]

  return {
    push,
    pop,
    peek,
    get length() {
      return heap.length
    },
  }
}

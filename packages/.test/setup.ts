const noop = () => undefined

function createCanvas2DContextMock(): CanvasRenderingContext2D {
  const gradient = { addColorStop: noop } as unknown as CanvasGradient
  const pattern = {} as CanvasPattern

  const target: Record<string, unknown> = {
    canvas: document.createElement('canvas'),
    measureText: () => ({ width: 0 } as TextMetrics),
    getLineDash: () => [],
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createPattern: () => pattern,
    getImageData: () =>
      ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      }) as ImageData,
    createImageData: () =>
      ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      }) as ImageData,
    putImageData: noop,
    isPointInPath: () => false,
    isPointInStroke: () => false,
  }

  return new Proxy(target, {
    get(obj, prop) {
      if (typeof prop === 'string' && prop in obj) {
        return obj[prop]
      }
      return noop
    },
    set(obj, prop, value) {
      if (typeof prop === 'string') {
        obj[prop] = value
      }
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

const context2DMock = createCanvas2DContextMock()

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(contextId: string): RenderingContext | null {
    if (contextId === '2d') {
      return context2DMock
    }
    return null
  },
})

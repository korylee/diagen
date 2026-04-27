import { batch, createComponent, createEffect } from 'solid-js'
import { render } from 'solid-js/web'
import { createDesigner, createShape, type AutoGrowConfig, type Designer, type ShapeElement } from '@diagen/core'
import { createDgBem, type Point } from '@diagen/shared'
import { DesignerProvider, useInteraction } from '../context'
import { Renderer } from '../scene'

interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface HarnessShapeInput {
  id: string
  x: number
  y: number
  w?: number
  h?: number
}

export interface CreateRendererTestHarnessOptions {
  viewportRect?: RectLike
  pageWidth?: number
  pageHeight?: number
  shapes?: HarnessShapeInput[]
  autoGrow?: Partial<AutoGrowConfig>
  useRendererInitialView?: boolean
  rendererProps?: Omit<Parameters<typeof Renderer>[0], 'children'>
}

type CapturedInteraction = ReturnType<typeof useInteraction>

const DefaultViewportRect: RectLike = {
  left: 120,
  top: 80,
  width: 900,
  height: 700,
}

const DefaultPageWidth = 1200
const DefaultPageHeight = 900
const DefaultContainerInset = 10

function flushEffects(): Promise<void> {
  return Promise.resolve()
    .then(() => undefined)
    .then(() => undefined)
}

function createDomRect(rect: RectLike) {
  return {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => rect,
  }
}

function defineWritableNumber(target: object, key: string, initialValue: number): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value: initialValue,
  })
}

function defineGetter(target: object, key: string, getter: () => number): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    get: getter,
  })
}

function createRectShape(input: HarnessShapeInput): ShapeElement {
  return createShape({
    id: input.id,
    name: input.id,
    group: null,
    props: {
      x: input.x,
      y: input.y,
      w: input.w ?? 100,
      h: input.h ?? 80,
      angle: 0,
    },
  })
}

function InteractionProbe(props: { onReady: (interaction: CapturedInteraction) => void }) {
  const interaction = useInteraction()

  createEffect(() => {
    props.onReady(interaction)
  })

  const marker = document.createElement('div')
  marker.setAttribute('data-testid', 'renderer-test-probe')
  return marker
}

function HarnessApp(props: {
  pageWidth: number
  pageHeight: number
  shapes: HarnessShapeInput[]
  autoGrow?: Partial<AutoGrowConfig>
  rendererProps?: Omit<Parameters<typeof Renderer>[0], 'children'>
  onReady: (payload: { designer: Designer; interaction: CapturedInteraction }) => void
}) {
  const designer = createDesigner({
    page: {
      width: props.pageWidth,
      height: props.pageHeight,
      backgroundColor: 'rgb(255,255,255)',
    },
    containerInset: DefaultContainerInset,
    autoGrow: {
      enabled: false,
      ...props.autoGrow,
    },
  })

  if (props.shapes.length > 0) {
    batch(() => {
      designer.edit.add(props.shapes.map(createRectShape), {
        record: false,
        select: false,
      })
    })
  }

  return createComponent(DesignerProvider, {
    designer,
    get children() {
      return createComponent(Renderer, {
        ...props.rendererProps,
        get overlay() {
          return createComponent(InteractionProbe, {
            onReady: interaction => {
              props.onReady({
                designer,
                interaction,
              })
            },
          })
        },
      })
    },
  })
}

const bem = createDgBem('renderer')

export async function createRendererTestHarness(options: CreateRendererTestHarnessOptions = {}): Promise<{
  designer: Designer
  viewport: HTMLDivElement
  container: HTMLDivElement
  sceneLayer: HTMLDivElement
  overlayLayer: HTMLDivElement
  getInteraction: () => CapturedInteraction
  canvasToClient: (point: Point) => Point
  getOverlayElementsByCursor: (cursor: string) => HTMLElement[]
  dispatchSceneMouseDownAtCanvas: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchSceneMouseMoveAtCanvas: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchSceneDoubleClickAtCanvas: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchSceneContextMenuAtCanvas: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchElementMouseDownAtClient: (element: HTMLElement, point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchElementMouseDown: (element: HTMLElement, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchWindowMouseMoveAtCanvas: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchWindowMouseMoveAtClient: (point: Point, init?: MouseEventInit) => Promise<MouseEvent>
  dispatchWindowMouseUp: (init?: MouseEventInit) => Promise<MouseEvent>
  dispatchCtrlWheelAtCanvas: (point: Point, deltaY: number) => Promise<WheelEvent>
  setScroll: (left: number, top: number) => Promise<void>
  dispose: () => void
}> {
  const viewportRect = options.viewportRect ?? DefaultViewportRect
  const pageWidth = options.pageWidth ?? DefaultPageWidth
  const pageHeight = options.pageHeight ?? DefaultPageHeight
  const host = document.createElement('div')
  document.body.appendChild(host)

  const shapes = options.shapes ?? []
  let capturedDesigner: Designer | null = null
  let capturedInteraction: CapturedInteraction | null = null
  const disposeRender = render(
    () =>
      createComponent(HarnessApp, {
        pageWidth,
        pageHeight,
        shapes,
        autoGrow: options.autoGrow,
        rendererProps: options.rendererProps,
        onReady: payload => {
          capturedDesigner = payload.designer
          capturedInteraction = payload.interaction
        },
      }),
    host,
  )

  await flushEffects()

  const viewportCandidate = host.querySelector(`.${bem('viewport')}`)
  const containerCandidate = host.querySelector(`.${bem('container')}`)
  const sceneLayerCandidate = host.querySelector(`.${bem('scene')}`)
  const overlayLayerCandidate = host.querySelector(`.${bem('overlay')}`)

  if (
    !viewportCandidate ||
    !containerCandidate ||
    !sceneLayerCandidate ||
    !overlayLayerCandidate ||
    !capturedInteraction ||
    !capturedDesigner
  ) {
    disposeRender()
    host.remove()
    throw new Error('renderer test harness 初始化失败')
  }

  const designer: Designer = capturedDesigner
  const viewport = viewportCandidate as HTMLDivElement
  const container = containerCandidate as HTMLDivElement
  const sceneLayer = sceneLayerCandidate as HTMLDivElement
  const overlayLayer = overlayLayerCandidate as HTMLDivElement

  defineWritableNumber(viewport, 'scrollLeft', 0)
  defineWritableNumber(viewport, 'scrollTop', 0)
  defineGetter(viewport, 'clientWidth', () => viewportRect.width)
  defineGetter(viewport, 'clientHeight', () => viewportRect.height)
  defineGetter(viewport, 'scrollWidth', () => designer.view.worldSize().width + DefaultContainerInset * 2)
  defineGetter(viewport, 'scrollHeight', () => designer.view.worldSize().height + DefaultContainerInset * 2)

  Object.defineProperty(viewport, 'getBoundingClientRect', {
    configurable: true,
    value: () => createDomRect(viewportRect),
  })

  Object.defineProperty(sceneLayer, 'getBoundingClientRect', {
    configurable: true,
    value: () => {
      const left = viewportRect.left + DefaultContainerInset - viewport.scrollLeft
      const top = viewportRect.top + DefaultContainerInset - viewport.scrollTop
      const worldSize = designer.view.worldSize()
      return createDomRect({
        left,
        top,
        width: worldSize.width,
        height: worldSize.height,
      })
    },
  })

  window.dispatchEvent(new Event('resize'))
  await flushEffects()

  if (!options.useRendererInitialView) {
    designer.view.setPan(0, 0)
    designer.view.setZoom(1)
    viewport.scrollLeft = 0
    viewport.scrollTop = 0
    viewport.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    await flushEffects()
  }

  const getInteraction = (): CapturedInteraction => {
    if (!capturedInteraction) {
      throw new Error('interaction context 尚未就绪')
    }
    return capturedInteraction
  }

  const canvasToClient = (point: Point): Point => {
    const screenPoint = designer.view.toScreen(point)
    const rect = sceneLayer.getBoundingClientRect()
    return {
      x: rect.left + screenPoint.x,
      y: rect.top + screenPoint.y,
    }
  }

  const getOverlayElementsByCursor = (cursor: string): HTMLElement[] =>
    Array.from(overlayLayer.querySelectorAll<HTMLElement>('*')).filter(element => {
      if (element.style.cursor === cursor) return true
      const styleText = (element.getAttribute('style') ?? '').replace(/\s+/g, '')
      return styleText.includes(`cursor:${cursor}`)
    })

  async function dispatchMouseEvent(
    target: EventTarget,
    type: 'mousedown' | 'mousemove' | 'mouseup' | 'contextmenu' | 'dblclick',
    point: Point,
    init: MouseEventInit = {},
  ): Promise<MouseEvent> {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      button: init.button ?? (type === 'contextmenu' ? 2 : 0),
      buttons: init.buttons ?? (type === 'mouseup' || type === 'contextmenu' ? 0 : 1),
      ctrlKey: init.ctrlKey ?? false,
      altKey: init.altKey ?? false,
      shiftKey: init.shiftKey ?? false,
      metaKey: init.metaKey ?? false,
    })
    target.dispatchEvent(event)
    await flushEffects()
    return event
  }

  async function dispatchSceneMouseDownAtCanvas(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(sceneLayer, 'mousedown', canvasToClient(point), init)
  }

  async function dispatchSceneMouseMoveAtCanvas(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(sceneLayer, 'mousemove', canvasToClient(point), init)
  }

  async function dispatchSceneDoubleClickAtCanvas(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(sceneLayer, 'dblclick', canvasToClient(point), init)
  }

  async function dispatchSceneContextMenuAtCanvas(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(container, 'contextmenu', canvasToClient(point), init)
  }

  async function dispatchElementMouseDownAtClient(
    element: HTMLElement,
    point: Point,
    init: MouseEventInit = {},
  ): Promise<MouseEvent> {
    return dispatchMouseEvent(element, 'mousedown', point, init)
  }

  async function dispatchElementMouseDown(element: HTMLElement, init: MouseEventInit = {}): Promise<MouseEvent> {
    const rect = element.getBoundingClientRect()
    return dispatchMouseEvent(
      element,
      'mousedown',
      {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      },
      init,
    )
  }

  async function dispatchWindowMouseMoveAtCanvas(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(window, 'mousemove', canvasToClient(point), init)
  }

  async function dispatchWindowMouseMoveAtClient(point: Point, init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(window, 'mousemove', point, init)
  }

  async function dispatchWindowMouseUp(init: MouseEventInit = {}): Promise<MouseEvent> {
    return dispatchMouseEvent(window, 'mouseup', { x: 0, y: 0 }, init)
  }

  async function dispatchCtrlWheelAtCanvas(point: Point, deltaY: number): Promise<WheelEvent> {
    const clientPoint = canvasToClient(point)
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: clientPoint.x,
      clientY: clientPoint.y,
      deltaY,
      ctrlKey: true,
    })
    container.dispatchEvent(event)
    await flushEffects()
    return event
  }

  async function setScroll(left: number, top: number): Promise<void> {
    viewport.scrollLeft = left
    viewport.scrollTop = top
    viewport.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new Event('scroll'))
    await flushEffects()
  }

  return {
    designer,
    viewport,
    container,
    sceneLayer,
    overlayLayer,
    getInteraction,
    canvasToClient,
    getOverlayElementsByCursor,
    dispatchSceneMouseDownAtCanvas,
    dispatchSceneMouseMoveAtCanvas,
    dispatchSceneDoubleClickAtCanvas,
    dispatchSceneContextMenuAtCanvas,
    dispatchElementMouseDownAtClient,
    dispatchElementMouseDown,
    dispatchWindowMouseMoveAtCanvas,
    dispatchWindowMouseMoveAtClient,
    dispatchWindowMouseUp,
    dispatchCtrlWheelAtCanvas,
    setScroll,
    dispose: () => {
      disposeRender()
      host.remove()
    },
  }
}

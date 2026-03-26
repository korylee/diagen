import { createSignal } from 'solid-js'
import type { EventToCanvas } from './createCoordinateService'
import type { BeginLinkerCreateOptions, BeginLinkerEditOptions } from './createLinkerDrag'
import type { CreateLinkerDrag } from './createLinkerDrag'
import type { CreateSelection } from './createSelection'
import type { CreatePan } from './createPan'
import type { CreateResize, ResizeDirection } from './createResize'
import type { CreateRotate } from './createRotate'
import type { CreateShapeDrag } from './createShapeDrag'

export type InteractionMode =
  | 'idle'
  | 'panning'
  | 'draggingShape'
  | 'draggingLinker'
  | 'resizing'
  | 'rotatingShape'
  | 'boxSelecting'

interface CreateInteractionMachineOptions {
  pan: CreatePan
  shapeDrag: CreateShapeDrag
  linkerDrag: CreateLinkerDrag
  resize: CreateResize
  rotate: CreateRotate
  boxSelect: CreateSelection
  eventToCanvas: EventToCanvas
}

export function createInteractionMachine(options: CreateInteractionMachineOptions) {
  const { pan, shapeDrag, linkerDrag, resize, rotate, boxSelect, eventToCanvas } = options
  const [mode, setMode] = createSignal<InteractionMode>('idle')

  const isIdle = (): boolean => mode() === 'idle'
  const isActive = (): boolean => mode() !== 'idle'
  const shouldShowGrabbingCursor = (): boolean => {
    const current = mode()
    return (
      current === 'panning' ||
      current === 'draggingShape' ||
      current === 'draggingLinker' ||
      current === 'rotatingShape'
    )
  }
  const shouldAutoScroll = (): boolean => {
    const current = mode()
    return (
      current === 'draggingShape' ||
      current === 'draggingLinker' ||
      current === 'resizing' ||
      current === 'rotatingShape' ||
      current === 'boxSelecting'
    )
  }

  const startPan = (e: MouseEvent): boolean => {
    if (!isIdle()) return false
    const started = pan.start(e)
    if (!started) return false
    setMode('panning')
    return true
  }

  const startBoxSelect = (e: MouseEvent): boolean => {
    if (!isIdle()) return false
    const started = boxSelect.start(eventToCanvas(e))
    if (!started) return false
    setMode('boxSelecting')
    return true
  }

  const startShapeDrag = (e: MouseEvent, ids?: string[]): boolean => {
    if (!isIdle()) return false
    const started = shapeDrag.start(e, ids)
    if (!started) return false
    setMode('draggingShape')
    return true
  }

  const startResize = (id: string, dir: ResizeDirection, e: MouseEvent): boolean => {
    if (!isIdle()) return false
    const started = resize.start(id, dir, e)
    if (!started) return false
    setMode('resizing')
    return true
  }

  const startRotate = (id: string, e: MouseEvent): boolean => {
    if (!isIdle()) return false
    const started = rotate.start(id, e)
    if (!started) return false
    setMode('rotatingShape')
    return true
  }

  const beginLinkerEdit = (e: MouseEvent, options: BeginLinkerEditOptions): boolean => {
    if (!isIdle()) return false
    const started = linkerDrag.beginEdit(e, options)
    if (!started) return false
    setMode('draggingLinker')
    return true
  }

  const beginLinkerCreate = (e: MouseEvent, options: BeginLinkerCreateOptions): boolean => {
    if (!isIdle()) return false
    const started = linkerDrag.beginCreate(e, options)
    if (!started) return false
    setMode('draggingLinker')
    return true
  }

  const move = (e: MouseEvent): void => {
    switch (mode()) {
      case 'panning':
        pan.move(e)
        break
      case 'draggingShape':
        shapeDrag.move(e)
        break
      case 'draggingLinker':
        linkerDrag.move(e)
        break
      case 'resizing':
        resize.move(e)
        break
      case 'rotatingShape':
        rotate.move(e)
        break
      case 'boxSelecting':
        boxSelect.move(eventToCanvas(e))
        break
      default:
        break
    }
  }

  const end = (): void => {
    switch (mode()) {
      case 'panning':
        pan.end()
        break
      case 'draggingShape':
        shapeDrag.end()
        break
      case 'draggingLinker':
        linkerDrag.end()
        break
      case 'resizing':
        resize.end()
        break
      case 'rotatingShape':
        rotate.end()
        break
      case 'boxSelecting':
        boxSelect.end()
        break
      default:
        break
    }
    setMode('idle')
  }

  const cancel = (): void => {
    switch (mode()) {
      case 'panning':
        pan.end()
        break
      case 'draggingShape':
        shapeDrag.cancel()
        break
      case 'draggingLinker':
        linkerDrag.cancel()
        break
      case 'resizing':
        resize.cancel()
        break
      case 'rotatingShape':
        rotate.cancel()
        break
      case 'boxSelecting':
        boxSelect.cancel()
        break
      default:
        break
    }
    setMode('idle')
  }

  return {
    mode,
    isIdle,
    isActive,
    shouldShowGrabbingCursor,
    shouldAutoScroll,
    startPan,
    startBoxSelect,
    startShapeDrag,
    startResize,
    startRotate,
    beginLinkerEdit,
    beginLinkerCreate,
    move,
    end,
    cancel,
  }
}

export type CreateInteractionMachine = ReturnType<typeof createInteractionMachine>

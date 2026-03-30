import { createSignal } from 'solid-js'
import type { EventToCanvas } from '../createCoordinateService'
import type {
  BeginLinkerCreateOptions,
  BeginLinkerEditOptions,
  CreateLinkerDrag,
} from './interactions/createLinkerDrag'
import type { CreatePan } from './interactions/createPan'
import type { CreateResize, ResizeDirection } from './interactions/createResize'
import type { CreateRotate } from './interactions/createRotate'
import type { CreateSelection } from './interactions/createSelection'
import type { CreateShapeDrag } from './interactions/createShapeDrag'

export type InteractionMode =
  | 'idle'
  | 'panning'
  | 'draggingShape'
  | 'draggingLinker'
  | 'resizing'
  | 'rotatingShape'
  | 'boxSelecting'

type ActiveInteractionMode = Exclude<InteractionMode, 'idle'>

interface ModeHandler {
  move: (event: MouseEvent) => void
  end: () => void
  cancel: () => void
  shouldAutoScroll: boolean
  shouldShowGrabbingCursor: boolean
}

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
  const modeHandlers: Record<ActiveInteractionMode, ModeHandler> = {
    panning: {
      move: event => pan.move(event),
      end: () => pan.end(),
      cancel: () => pan.end(),
      shouldAutoScroll: false,
      shouldShowGrabbingCursor: true,
    },
    draggingShape: {
      move: event => shapeDrag.move(event),
      end: () => shapeDrag.end(),
      cancel: () => shapeDrag.cancel(),
      shouldAutoScroll: true,
      shouldShowGrabbingCursor: true,
    },
    draggingLinker: {
      move: event => linkerDrag.move(event),
      end: () => linkerDrag.end(),
      cancel: () => linkerDrag.cancel(),
      shouldAutoScroll: true,
      shouldShowGrabbingCursor: true,
    },
    resizing: {
      move: event => resize.move(event),
      end: () => resize.end(),
      cancel: () => resize.cancel(),
      shouldAutoScroll: true,
      shouldShowGrabbingCursor: false,
    },
    rotatingShape: {
      move: event => rotate.move(event),
      end: () => rotate.end(),
      cancel: () => rotate.cancel(),
      shouldAutoScroll: true,
      shouldShowGrabbingCursor: true,
    },
    boxSelecting: {
      move: event => boxSelect.move(eventToCanvas(event)),
      end: () => boxSelect.end(),
      cancel: () => boxSelect.cancel(),
      shouldAutoScroll: true,
      shouldShowGrabbingCursor: false,
    },
  }

  const isIdle = (): boolean => mode() === 'idle'
  const isActive = (): boolean => mode() !== 'idle'
  const shouldShowGrabbingCursor = (): boolean => {
    const current = mode()
    if (current === 'idle') return false
    return modeHandlers[current].shouldShowGrabbingCursor
  }
  const shouldAutoScroll = (): boolean => {
    const current = mode()
    if (current === 'idle') return false
    return modeHandlers[current].shouldAutoScroll
  }

  const startMode = (nextMode: ActiveInteractionMode, startAction: () => boolean): boolean => {
    if (!isIdle()) return false
    const started = startAction()
    if (!started) return false
    setMode(nextMode)
    return true
  }

  const startPan = (e: MouseEvent): boolean => startMode('panning', () => pan.start(e))

  const startBoxSelect = (e: MouseEvent): boolean => startMode('boxSelecting', () => boxSelect.start(eventToCanvas(e)))

  const startShapeDrag = (e: MouseEvent, ids?: string[]): boolean =>
    startMode('draggingShape', () => shapeDrag.start(e, ids))

  const startResize = (id: string, dir: ResizeDirection, e: MouseEvent): boolean =>
    startMode('resizing', () => resize.start(id, dir, e))

  const startRotate = (id: string, e: MouseEvent): boolean => startMode('rotatingShape', () => rotate.start(id, e))

  const beginLinkerEdit = (e: MouseEvent, options: BeginLinkerEditOptions): boolean =>
    startMode('draggingLinker', () => linkerDrag.beginEdit(e, options))

  const beginLinkerCreate = (e: MouseEvent, options: BeginLinkerCreateOptions): boolean =>
    startMode('draggingLinker', () => linkerDrag.beginCreate(e, options))

  const move = (e: MouseEvent): void => {
    const current = mode()
    if (current === 'idle') return
    modeHandlers[current].move(e)
  }

  const end = (): void => {
    const current = mode()
    if (current === 'idle') return
    modeHandlers[current].end()
    setMode('idle')
  }

  const cancel = (): void => {
    const current = mode()
    if (current === 'idle') return
    modeHandlers[current].cancel()
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

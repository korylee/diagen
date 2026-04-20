import { isRotatable, isShape } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { getAngle } from '@diagen/shared'
import { onCleanup } from 'solid-js'
import { useDesigner } from '../../../context'
import type { CoordinateService } from '../../services/createCoordinateService'
import { createDragSession } from '../shared/createDragSession'
import type { CreatePointerDragTrackerOptions } from '../shared/createPointerDragTracker'

export interface RotateDragState {
  targetId: string
  startAngle: number
  startPointerAngle: number
  center: Point
}

export interface CreateRotateOptions extends CreatePointerDragTrackerOptions {
  snapStep?: number
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

function normalizeDeltaAngle(delta: number): number {
  let val = ((((delta + 180) % 360) + 360) % 360) - 180
  if (val === -180) val = 180
  return val
}

export function createRotate(coordinate: Pick<CoordinateService, 'eventToCanvas'>, options: CreateRotateOptions = {}) {
  const { eventToCanvas } = coordinate
  const { threshold = 2, snapStep = 15 } = options
  const { element, edit, history } = useDesigner()
  const transaction = history.createScope('旋转图形')
  let session!: ReturnType<typeof createDragSession<{ id: string; event: MouseEvent }, RotateDragState>>
  session = createDragSession({
    threshold,
    transaction,
    setup: input => {
      const shape = element.getElementById(input.id)
      if (!shape || !isShape(shape) || !isRotatable(shape)) return null
      if (!eventToCanvas) return null

      const center = {
        x: shape.props.x + shape.props.w / 2,
        y: shape.props.y + shape.props.h / 2,
      }
      const pointer = eventToCanvas(input.event)

      return {
        targetId: input.id,
        startAngle: shape.props.angle ?? 0,
        center,
        startPointerAngle: getAngle(pointer, center),
      }
    },
    update: ({ state, event }) => {
      if (!eventToCanvas) return

      const shape = element.getElementById(state.targetId)
      if (!shape || !isShape(shape)) {
        session.cancel()
        return
      }

      const pointer = eventToCanvas(event)
      const currentPointerAngle = getAngle(pointer, state.center)
      const delta = normalizeDeltaAngle(currentPointerAngle - state.startPointerAngle)

      let nextAngle = normalizeAngle(state.startAngle + delta)
      if (event.shiftKey && snapStep > 0) {
        nextAngle = Math.round(nextAngle / snapStep) * snapStep
        nextAngle = normalizeAngle(nextAngle)
      }

      const { props } = shape
      if (props.angle === nextAngle) return

      const b = {
        ...props,
        angle: nextAngle,
      }
      edit.update(state.targetId, 'props', b)
    },
  })

  const start = (id: string, e: MouseEvent): boolean => session.begin({ id, event: e })
  const move = (e: MouseEvent): void => session.move(e)
  const end = (): void => session.end()
  const cancel = (): void => session.cancel()

  onCleanup(() => {
    if (session.isActive()) cancel()
  })

  return {
    isActive: session.isActive,
    state: session.state,
    start,
    move,
    end,
    cancel,
  }
}

export type CreateRotate = ReturnType<typeof createRotate>

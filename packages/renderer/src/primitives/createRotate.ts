import { onCleanup } from 'solid-js'
import { isRotatable, isShape } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { getRotatedBoxBounds } from '@diagen/shared'
import { useDesigner } from '../components'
import type { EventToCanvas } from './createCoordinateService'
import { createDragSession } from './createDragSession'
import type { CreatePointerDragTrackerOptions } from './createPointerDragTracker'

export interface RotateDragState {
  targetId: string
  startAngle: number
  startPointerAngle: number
  center: Point
}

export interface CreateRotateOptions extends CreatePointerDragTrackerOptions {
  eventToCanvas?: EventToCanvas
  snapStep?: number
}

function getAngleByPoint(point: Point, center: Point): number {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
}

function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}

function normalizeDeltaAngle(delta: number): number {
  let val = ((((delta + 180) % 360) + 360) % 360) - 180
  if (val === -180) val = 180
  return val
}

export function createRotate(options: CreateRotateOptions = {}) {
  const { threshold = 2, snapStep = 15, eventToCanvas } = options
  const { element, edit, view, history } = useDesigner()
  const transaction = history.transaction.createScope('旋转图形')
  let session!: ReturnType<typeof createDragSession<{ id: string; event: MouseEvent }, RotateDragState>>
  session = createDragSession({
    threshold,
    transaction,
    getEvent: input => input.event,
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
        startPointerAngle: getAngleByPoint(pointer, center),
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
      const currentPointerAngle = getAngleByPoint(pointer, state.center)
      const delta = normalizeDeltaAngle(currentPointerAngle - state.startPointerAngle)

      let nextAngle = normalizeAngle(state.startAngle + delta)
      if (event.shiftKey && snapStep > 0) {
        nextAngle = Math.round(nextAngle / snapStep) * snapStep
        nextAngle = normalizeAngle(nextAngle)
      }

      if (shape.props.angle === nextAngle) return

      edit.update(state.targetId, 'props', {
        ...shape.props,
        angle: nextAngle,
      })

      view.scheduleAutoGrow(
        getRotatedBoxBounds({
          x: shape.props.x,
          y: shape.props.y,
          w: shape.props.w,
          h: shape.props.h,
          angle: nextAngle,
        }),
      )
    },
    onCommit: () => {
      view.flushAutoGrow()
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

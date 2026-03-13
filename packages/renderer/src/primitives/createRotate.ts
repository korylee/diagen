import { batch, createSignal, onCleanup } from 'solid-js'
import { isRotatable, isShape } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { useDesigner } from '../components'
import { getRotatedBoxBounds } from '../utils'
import type { EventToCanvas } from './createCoordinateService'
import type { CreateDragSessionOptions } from './createDragSession'
import { createTransactionalSession } from './createTransactionalSession'

export interface CreateRotateOptions extends CreateDragSessionOptions {
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
  let val = ((delta + 180) % 360 + 360) % 360 - 180
  if (val === -180) val = 180
  return val
}

export function createRotate(options: CreateRotateOptions = {}) {
  const { threshold = 2, snapStep = 15, eventToCanvas } = options
  const designer = useDesigner()
  const { element, edit, view } = designer
  const transaction = designer.history.transaction.createScope('旋转图形')
  const session = createTransactionalSession({
    threshold,
    transaction,
    onCommit: () => {
      view.flushAutoGrow()
    },
  })

  const [targetId, setTargetId] = createSignal<string | null>(null)
  const [startAngle, setStartAngle] = createSignal<number>(0)
  const [startPointerAngle, setStartPointerAngle] = createSignal<number>(0)
  const [center, setCenter] = createSignal<Point | null>(null)

  function isRotating(): boolean {
    return session.isDragging()
  }

  function start(id: string, e: MouseEvent): boolean {
    const shape = element.getById(id)
    if (!shape || !isShape(shape) || !isRotatable(shape)) return false
    if (!eventToCanvas) return false

    const centerPoint = {
      x: shape.props.x + shape.props.w / 2,
      y: shape.props.y + shape.props.h / 2,
    }
    const pointer = eventToCanvas(e)

    batch(() => {
      setTargetId(id)
      setStartAngle(shape.props.angle ?? 0)
      setCenter(centerPoint)
      setStartPointerAngle(getAngleByPoint(pointer, centerPoint))
    })
    session.begin({ x: e.clientX, y: e.clientY })
    return true
  }

  function move(e: MouseEvent): void {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    if (!moveState || !moveState.shouldUpdate || !eventToCanvas) return

    const id = targetId()
    const centerPoint = center()
    if (!id || !centerPoint) return

    const shape = element.getById(id)
    if (!shape || !isShape(shape)) {
      cancel()
      return
    }

    const pointer = eventToCanvas(e)
    const currentPointerAngle = getAngleByPoint(pointer, centerPoint)
    const delta = normalizeDeltaAngle(currentPointerAngle - startPointerAngle())

    let nextAngle = normalizeAngle(startAngle() + delta)
    if (e.shiftKey && snapStep > 0) {
      nextAngle = Math.round(nextAngle / snapStep) * snapStep
      nextAngle = normalizeAngle(nextAngle)
    }

    if (shape.props.angle === nextAngle) return

    edit.update(id, {
      props: {
        ...shape.props,
        angle: nextAngle,
      },
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
  }

  function end(): void {
    if (session.isPending()) {
      session.finish()
    }
    reset()
  }

  function cancel(): void {
    if (session.isPending()) {
      session.cancel()
    }
    reset()
  }

  function reset(): void {
    batch(() => {
      setTargetId(null)
      setCenter(null)
      setStartAngle(0)
      setStartPointerAngle(0)
    })
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isRotating,
    isPending: session.isPending,
    targetId,
    start,
    move,
    end,
    cancel,
  }
}

export type CreateRotate = ReturnType<typeof createRotate>

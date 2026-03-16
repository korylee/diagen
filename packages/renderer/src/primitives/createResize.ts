import { batch, createSignal, onCleanup } from 'solid-js'
import { isShape } from '@diagen/core'
import { getRotatedBoxBounds } from '@diagen/shared'
import type { Bounds, Point } from '@diagen/shared'
import { useDesigner } from '../components'
import { type EventToCanvas } from './createCoordinateService'
import type { CreateDragSessionOptions } from './createDragSession'
import { createPointerDeltaState } from './pointerDeltaState'
import { createTransactionalSession } from './createTransactionalSession'

// ============================================================================
// 调整大小 Hook - 与 Designer 集成
// ============================================================================

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_SIZE = 8

export function createResize(
  options: CreateDragSessionOptions & {
    minWidth?: number
    minHeight?: number
    eventToCanvas?: EventToCanvas
  } = {},
) {
  const { threshold = 0, minWidth = 20, minHeight = 20, eventToCanvas } = options
  const { element, history, selection, view, edit } = useDesigner()
  const transaction = history.transaction.createScope('调整尺寸')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })
  const session = createTransactionalSession({
    threshold,
    transaction,
    onCommit: () => {
      view.flushAutoGrow()
    },
  })

  const [targetId, setTargetId] = createSignal<string | null>(null)
  const [direction, setDirection] = createSignal<ResizeDirection | null>(null)
  const [startBounds, setStartBounds] = createSignal<Bounds | null>(null)
  const [ratio, setRatio] = createSignal(1)

  const isResizing = () => targetId() !== null

  const start = (id: string, dir: ResizeDirection, e: MouseEvent) => {
    const el = element.getById(id)
    if (!el || !isShape(el)) return

    const bounds = view.getElementBounds(el)

    if (!bounds) return

    batch(() => {
      setTargetId(id)
      setDirection(dir)
      setStartBounds(bounds)
      pointerDelta.setStartFromEvent(e)
      setRatio(bounds.w / bounds.h)
    })
    session.begin({ x: e.clientX, y: e.clientY })
  }

  const move = (e: MouseEvent) => {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    if (!moveState || !moveState.shouldUpdate) return

    const bounds = startBounds()
    const dir = direction()
    const id = targetId()
    if (!bounds || !dir || !id) return

    const zoom = view.viewport().zoom
    const delta = pointerDelta.resolveDelta({
      moveState,
      zoom,
      event: e,
    })
    const dx = delta.x
    const dy = delta.y

    let { x, y, w, h } = bounds
    const keepRatio = e.shiftKey
    const center = e.altKey

    if (dir.includes('n')) {
      y = bounds.y + dy
      h = bounds.h - dy
    }
    if (dir.includes('s')) {
      h = bounds.h + dy
    }
    if (dir.includes('w')) {
      x = bounds.x + dx
      w = bounds.w - dx
    }
    if (dir.includes('e')) {
      w = bounds.w + dx
    }

    if (keepRatio) {
      const r = ratio()
      if (['n', 's'].includes(dir)) w = h * r
      else if (['e', 'w'].includes(dir)) h = w / r
      else if (Math.abs(dx) > Math.abs(dy)) h = w / r
      else w = h * r
    }

    if (center) {
      const cx = bounds.x + bounds.w / 2
      const cy = bounds.y + bounds.h / 2
      x = cx - w / 2
      y = cy - h / 2
    }

    w = Math.max(minWidth, w)
    h = Math.max(minHeight, h)

    const el = element.getById(id)
    if (el && isShape(el)) {
      edit.update(id, { props: { ...el.props, x, y, w, h } })
      view.scheduleAutoGrow(
        getRotatedBoxBounds({
          x,
          y,
          w,
          h,
          angle: el.props.angle,
        }),
      )
    }
  }

  const end = () => {
    if (session.isPending()) {
      session.finish()
    }
    reset()
  }

  const cancel = () => {
    if (session.isPending()) {
      session.cancel()
    }
    reset()
  }

  const reset = () => {
    batch(() => {
      setTargetId(null)
      setDirection(null)
      setStartBounds(null)
      pointerDelta.clear()
    })
  }

  const hitTest = (point: Point): { id: string; dir: ResizeDirection } | null => {
    const selected = selection.selectedIds()
    if (selected.length !== 1) return null

    const id = selected[0]
    const el = element.getById(id)
    if (!el || !isShape(el)) return null

    const { x, y, w, h } = el.props
    const size = HANDLE_SIZE / view.viewport().zoom

    const handles = [
      { dir: 'nw', px: x, py: y },
      { dir: 'n', px: x + w / 2, py: y },
      { dir: 'ne', px: x + w, py: y },
      { dir: 'w', px: x, py: y + h / 2 },
      { dir: 'e', px: x + w, py: y + h / 2 },
      { dir: 'sw', px: x, py: y + h },
      { dir: 's', px: x + w / 2, py: y + h },
      { dir: 'se', px: x + w, py: y + h },
    ] as const

    for (const h of handles) {
      if (Math.abs(point.x - h.px) <= size && Math.abs(point.y - h.py) <= size) {
        return { id, dir: h.dir }
      }
    }
    return null
  }

  onCleanup(() => {
    if (isResizing() || session.isPending()) cancel()
  })

  return { isResizing, direction, targetId, start, move, end, cancel, hitTest }
}

export type CreateResize = ReturnType<typeof createResize>

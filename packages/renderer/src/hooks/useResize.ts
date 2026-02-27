import { batch, createSignal, onCleanup } from 'solid-js'
import type { Point, Rect } from '@diagen/shared'
import { useDesigner } from '../components'
import { isShape } from '@diagen/core'

// ============================================================================
// 调整大小 Hook - 与 Designer 集成
// ============================================================================

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const HANDLE_SIZE = 8

export function useResize(
  options: {
    minWidth?: number
    minHeight?: number
  } = {},
) {
  const { minWidth = 20, minHeight = 20 } = options
  const designer = useDesigner()

  const [targetId, setTargetId] = createSignal<string | null>(null)
  const [direction, setDirection] = createSignal<ResizeDirection | null>(null)
  const [startBounds, setStartBounds] = createSignal<Rect | null>(null)
  const [startMouse, setStartMouse] = createSignal<Point | null>(null)
  const [ratio, setRatio] = createSignal(1)

  const isResizing = () => targetId() !== null

  const start = (id: string, dir: ResizeDirection, e: MouseEvent) => {
    const el = designer.element.getById(id)
    if (!el || !isShape(el)) return

    const bounds: Rect = { x: el.props.x, y: el.props.y, w: el.props.w, h: el.props.h }

    batch(() => {
      setTargetId(id)
      setDirection(dir)
      setStartBounds(bounds)
      setStartMouse({ x: e.clientX, y: e.clientY })
      setRatio(bounds.w / bounds.h)
    })

    designer.history.transaction.begin()
  }

  const move = (e: MouseEvent) => {
    const start = startMouse()
    const bounds = startBounds()
    const dir = direction()
    const id = targetId()
    if (!start || !bounds || !dir || !id) return

    const zoom = designer.state.viewport.zoom
    const dx = (e.clientX - start.x) / zoom
    const dy = (e.clientY - start.y) / zoom

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

    const el = designer.element.getById(id)
    if (el && isShape(el)) {
      designer.edit.update(id, { props: { ...el.props, x, y, w, h } })
    }
  }

  const end = () => {
    designer.history.transaction.commit()
    reset()
  }

  const cancel = () => {
    designer.history.transaction.abort()
    reset()
  }

  const reset = () => {
    batch(() => {
      setTargetId(null)
      setDirection(null)
      setStartBounds(null)
      setStartMouse(null)
    })
  }

  const hitTest = (point: Point): { id: string; dir: ResizeDirection } | null => {
    const selected = designer.selection.selectedIds()
    if (selected.length !== 1) return null

    const id = selected[0]
    const el = designer.element.getById(id)
    if (!el || !isShape(el)) return null

    const { x, y, w, h } = el.props
    const size = HANDLE_SIZE / designer.state.viewport.zoom

    const handles: Array<{ dir: ResizeDirection; px: number; py: number }> = [
      { dir: 'nw', px: x, py: y },
      { dir: 'n', px: x + w / 2, py: y },
      { dir: 'ne', px: x + w, py: y },
      { dir: 'w', px: x, py: y + h / 2 },
      { dir: 'e', px: x + w, py: y + h / 2 },
      { dir: 'sw', px: x, py: y + h },
      { dir: 's', px: x + w / 2, py: y + h },
      { dir: 'se', px: x + w, py: y + h },
    ]

    for (const h of handles) {
      if (Math.abs(point.x - h.px) <= size && Math.abs(point.y - h.py) <= size) {
        return { id, dir: h.dir }
      }
    }
    return null
  }

  onCleanup(() => {
    if (isResizing()) cancel()
  })

  return { isResizing, direction, targetId, start, move, end, cancel, hitTest }
}

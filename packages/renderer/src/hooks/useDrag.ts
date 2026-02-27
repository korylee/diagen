import { createSignal, createMemo, onCleanup, batch } from 'solid-js'
import type { Point } from '@diagen/shared'
import { useDesigner } from '../components/DesignerProvider'
import { isShape } from '@diagen/core'

// ============================================================================
// 拖动 Hook - 与 Designer 集成
// ============================================================================

export interface UseDragOptions {
  threshold?: number
}


export function useDrag(options: UseDragOptions = {}) {
  const { threshold = 3 } = options
  const designer = useDesigner()

  const [isDragging, setIsDragging] = createSignal(false)
  const [isPending, setIsPending] = createSignal(false)// 已启动但未超过阈值
  const [startPositions, setStartPositions] = createSignal<Record<string, Point>>({})
  const [startMouse, setStartMouse] = createSignal<Point | null>(null)
  const [lastMouse, setLastMouse] = createSignal<Point | null>(null)

  const delta = createMemo<Point>(() => {
    const start = startMouse()
    const last = lastMouse()
    if (!start || !last) return { x: 0, y: 0 }
    return { x: last.x - start.x, y: last.y - start.y }
  })

  const start = (e: MouseEvent, ids?: string[]) => {
    const targetIds = ids ?? designer.selection.selectedIds()
    if (targetIds.length === 0) return

    const positions: Record<string, Point> = {}
    for (const id of targetIds) {
      const el = designer.element.getById(id)
      if (el && isShape(el)) {
        positions[id] = { x: el.props.x, y: el.props.y }
      }
    }

    if (Object.keys(positions).length === 0) return

    batch(() => {
      setStartPositions(positions)
      setStartMouse({ x: e.clientX, y: e.clientY })
      setLastMouse({ x: e.clientX, y: e.clientY })
      setIsPending(true)
      setIsDragging(threshold === 0)
    })

    designer.history.transaction.begin()
  }

  const move = (e: MouseEvent) => {
    if (!isPending()) return

    const start = startMouse()
    if (!start) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    // 检查阈值
    if (!isDragging()) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        setLastMouse({ x: e.clientX, y: e.clientY })
        return
      }
      setIsDragging(true)
    }

    setLastMouse({ x: e.clientX, y: e.clientY })

    // 应用移动
    const zoom = designer.state.viewport.zoom
    const positions = startPositions()

    for (const [id, startPos] of Object.entries(positions)) {
      const el = designer.element.getById(id)
      if (!el || !isShape(el)) continue

      designer.edit.update(id, {
        props: {
          ...el.props,
          x: startPos.x + dx / zoom,
          y: startPos.y + dy / zoom
        }
      })
    }
  }

  const end = () => {
    if (isDragging()) {
      designer.history.transaction.commit()
    } else {
      designer.history.transaction.abort()
    }
    reset()
  }

  const cancel = () => {
    designer.history.transaction.abort()
    reset()
  }

  const reset = () => {
    batch(() => {
      setIsDragging(false)
      setIsPending(false)
      setStartPositions({})
      setStartMouse(null)
      setLastMouse(null)
    })
  }

  onCleanup(() => {
    if (isPending()) cancel()
  })

  return { isDragging, isPending, delta, start, move, end, cancel }
}

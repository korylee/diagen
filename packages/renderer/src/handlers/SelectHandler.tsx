import { createSignal } from 'solid-js'
import type { Designer, DiagramElement } from '@diagen/core'
import { canvasRectToScreen, isShape } from '@diagen/core'
import type { Point, Rect } from '@diagen/shared'
import { useDrag, useSelection, useKeyboard } from '../hooks'
import type { HandlerContext, InteractionHandler, SelectHandlerOptions } from './types'

export function createSelectHandler(ctx: HandlerContext, options: SelectHandlerOptions = {}): InteractionHandler {
  const { threshold = 3 } = options

  const [startPositions, setStartPositions] = createSignal<Record<string, Point>>({})

  const drag = useDrag({
    threshold,
    onStart: (_point, e) => {
      const targetId = getTargetElementId(e.target as HTMLElement)
      if (!targetId) return false

      const store = ctx.store
      const isSelected = store.selection.isSelected(targetId)

      if (e.ctrlKey || e.metaKey) {
        if (isSelected) {
          store.selection.deselect(targetId)
        } else {
          store.selection.select(targetId)
        }
      } else if (!isSelected) {
        store.selection.replace([targetId])
      }

      const selectedIds = store.selection.selectedIds()
      const positions: Record<string, Point> = {}

      for (const id of selectedIds) {
        const el = store.getElementById(id)
        if (el && isShape(el)) {
          positions[id] = { x: el.props.x, y: el.props.y }
        }
      }

      setStartPositions(positions)
      store.history.startTransaction()
    },
    onMove: (delta) => {
      const store = ctx.store
      const positions = startPositions()
      const zoom = ctx.viewport().zoom

      for (const [id, startPos] of Object.entries(positions)) {
        const el = store.getElementById(id)
        if (el && isShape(el)) {
          store.updateElement(
            id,
            {
              props: {
                ...el.props,
                x: startPos.x + delta.x / zoom,
                y: startPos.y + delta.y / zoom,
              },
            },
            { record: false }
          )
        }
      }
    },
    onEnd: () => {
      ctx.store.history.commitTransaction()
      setStartPositions({})
    },
  })

  const selection = useSelection({
    minSize: 5,
    onEnd: (rect) => {
      const elements = findElementsInRect(ctx.store, rect)
      ctx.store.selection.replace(elements.map((el) => el.id))
    },
  })

  useKeyboard({
    shortcuts: [
      {
        key: 'Delete',
        action: () => {
          const ids = ctx.store.selection.selectedIds()
          if (ids.length > 0) {
            ctx.store.edit.remove(ids)
          }
        },
      },
      {
        key: 'Escape',
        action: () => {
          drag.cancel()
          selection.cancel()
        },
      },
      {
        key: 'a',
        ctrl: true,
        action: () => {
          const allIds = Object.keys(ctx.store.state.diagram.elements)
          ctx.store.selection.replace(allIds)
        },
      },
    ],
  })

  const getTargetElementId = (target: HTMLElement): string | null => {
    let el: HTMLElement | null = target
    while (el) {
      const id = el.dataset?.elementId
      if (id) return id
      el = el.parentElement
    }
    return null
  }

  const findElementsInRect = (store: Designer, rect: Rect): DiagramElement[] => {
    const result: DiagramElement[] = []
    const elements = Object.values(store.state.diagram.elements)

    for (const el of elements) {
      if (!isShape(el)) continue

      const elRect: Rect = {
        x: el.props.x,
        y: el.props.y,
        w: el.props.w,
        h: el.props.h,
      }

      if (rectsIntersect(rect, elRect)) {
        result.push(el)
      }
    }

    return result
  }

  const rectsIntersect = (a: Rect, b: Rect): boolean => {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y)
  }

  return {
    name: 'select',
    isActive: () => drag.isDragging() || selection.isSelecting(),
    onMouseDown: (e, point) => {
      const canvasPoint = ctx.screenToCanvas(point)

      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-container')) {
        selection.start(canvasPoint)
      } else {
        drag.start(e)
      }
    },
    onMouseMove: (_e, point) => {
      if (selection.isSelecting()) {
        const canvasPoint = ctx.screenToCanvas(point)
        selection.update(canvasPoint)
      }
    },
    onMouseUp: () => {
      selection.end()
    },
    onKeyDown: () => {},
    render: () => {
      if (!selection.isSelecting() || !selection.selectionRect()) return null

      const rect = selection.selectionRect()!
      const screenRect = canvasRectToScreen(rect, ctx.viewport())

      return (
        <div
          style={{
            position: 'absolute',
            left: `${screenRect.x}px`,
            top: `${screenRect.y}px`,
            width: `${screenRect.w}px`,
            height: `${screenRect.h}px`,
            border: '1px dashed #2196f3',
            'background-color': 'rgba(33, 150, 243, 0.1)',
            'pointer-events': 'none',
            'z-index': 9999,
          }}
        />
      )
    },
  }
}

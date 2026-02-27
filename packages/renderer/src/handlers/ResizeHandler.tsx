import { createSignal, createMemo } from 'solid-js'
import type { ShapeElement } from '@diagen/core'
import type { Point, Rect } from '@diagen/shared'
import { useResize, type ResizeDirection } from '../hooks'
import type { InteractionHandler, HandlerContext, ResizeHandlerOptions } from './types'

export function createResizeHandler(
  ctx: HandlerContext,
  options: ResizeHandlerOptions = {}
): InteractionHandler {
  const { minWidth = 20, minHeight = 20 } = options

  const [targetElementId, setTargetElementId] = createSignal<string | null>(null)
  const [originalBounds, setOriginalBounds] = createSignal<Rect | null>(null)

  const resize = useResize({
    minWidth,
    minHeight,
    onStart: (direction, bounds) => {
      ctx.store.history.startTransaction()
    },
    onChange: (newBounds) => {
      const id = targetElementId()
      if (!id) return

      const element = ctx.store.getElementById(id)
      if (!element || !isShapeElement(element)) return

      ctx.store.updateElement(id, {
        props: {
          x: newBounds.x,
          y: newBounds.y,
          w: newBounds.w,
          h: newBounds.h,
          angle: element.props.angle
        }
      }, { record: false })
    },
    onEnd: (newBounds) => {
      ctx.store.history.commitTransaction()
      setTargetElementId(null)
      setOriginalBounds(null)
    }
  })

  const startResize = (direction: ResizeDirection, elementId: string, startPoint: Point) => {
    const element = ctx.store.getElementById(elementId)
    if (!element || !isShapeElement(element)) return

    const bounds: Rect = {
      x: element.props.x,
      y: element.props.y,
      w: element.props.w,
      h: element.props.h
    }

    setTargetElementId(elementId)
    setOriginalBounds(bounds)

    const screenPoint = {
      x: startPoint.x * ctx.viewport().zoom + ctx.viewport().x,
      y: startPoint.y * ctx.viewport().zoom + ctx.viewport().y
    }

    resize.start(direction, bounds, screenPoint)
  }

  const isShapeElement = (el: any): el is ShapeElement => {
    return el && el.props && typeof el.props.x === 'number'
  }

  return {
    name: 'resize',
    isActive: resize.isResizing,
    onMouseDown: (e, point) => {
    },
    onMouseMove: (e, point) => {
      if (resize.isResizing()) {
        resize.update(point, {
          shift: e.shiftKey,
          alt: e.altKey
        })
      }
    },
    onMouseUp: (e, point) => {
      if (resize.isResizing()) {
        resize.end()
      }
    },
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        resize.cancel()
        setTargetElementId(null)
        setOriginalBounds(null)
      }
    },
    render: () => null
  }
}

export { type ResizeDirection }

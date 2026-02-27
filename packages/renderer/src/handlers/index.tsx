import { createSignal, createEffect, Show, For } from 'solid-js'
import type { Point } from '@diagen/shared'
import type { InteractionHandler, HandlerContext, HandlerMode } from './types'
import { createSelectHandler } from './SelectHandler'
import { createLinkerHandler } from './LinkerHandler'
import { createResizeHandler } from './ResizeHandler'
import type { ResizeDirection } from '../hooks'

export type { InteractionHandler, HandlerContext, HandlerMode }

export function createHandlerManager(ctx: HandlerContext) {
  const selectHandler = createSelectHandler(ctx)
  const linkerHandler = createLinkerHandler(ctx)
  const resizeHandler = createResizeHandler(ctx)

  const handlers = {
    select: selectHandler,
    linker: linkerHandler,
    resize: resizeHandler
  }

  const [activeHandler, setActiveHandler] = createSignal<InteractionHandler | null>(null)
  const [resizeDirection, setResizeDirection] = createSignal<ResizeDirection | null>(null)
  const [resizeElementId, setResizeElementId] = createSignal<string | null>(null)

  createEffect(() => {
    const tool = ctx.store.state.activeTool
    switch (tool) {
      case 'select':
        setActiveHandler(selectHandler)
        break
      case 'linker':
        setActiveHandler(linkerHandler)
        break
      default:
        setActiveHandler(selectHandler)
    }
  })

  const isInteracting = () => {
    return selectHandler.isActive()
      || linkerHandler.isActive()
      || resizeHandler.isActive()
  }

  const getCursor = (): string => {
    const dir = resizeDirection()
    if (dir) {
      const cursors: Record<ResizeDirection, string> = {
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        nw: 'nwse-resize',
        se: 'nwse-resize'
      }
      return cursors[dir]
    }

    if (linkerHandler.isActive()) return 'crosshair'
    if (selectHandler.isActive()) return 'move'
    return 'default'
  }

  const handleMouseDown = (e: MouseEvent) => {
    const containerRect = ctx.getContainerRect()
    if (!containerRect) return

    const point: Point = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top
    }

    const canvasPoint = ctx.screenToCanvas(point)

    if (resizeDirection() && resizeElementId()) {
      resizeHandler.onMouseDown(e, canvasPoint)
      return
    }

    activeHandler()?.onMouseDown(e, canvasPoint)
  }

  const handleMouseMove = (e: MouseEvent) => {
    const containerRect = ctx.getContainerRect()
    if (!containerRect) return

    const point: Point = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top
    }

    const canvasPoint = ctx.screenToCanvas(point)

    if (resizeHandler.isActive()) {
      resizeHandler.onMouseMove(e, canvasPoint)
      return
    }

    activeHandler()?.onMouseMove(e, canvasPoint)

    if (!isInteracting()) {
      const resizeHandle = findResizeHandle(canvasPoint)
      setResizeDirection(resizeHandle?.direction || null)
      setResizeElementId(resizeHandle?.elementId || null)
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    const containerRect = ctx.getContainerRect()
    if (!containerRect) return

    const point: Point = {
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top
    }

    const canvasPoint = ctx.screenToCanvas(point)

    if (resizeHandler.isActive()) {
      resizeHandler.onMouseUp(e, canvasPoint)
      return
    }

    activeHandler()?.onMouseUp(e, canvasPoint)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    activeHandler()?.onKeyDown(e)
    resizeHandler.onKeyDown(e)
  }

  const findResizeHandle = (point: Point): { direction: ResizeDirection; elementId: string } | null => {
    const selectedIds = ctx.store.selection.selectedIds()
    if (selectedIds.length !== 1) return null

    const element = ctx.store.getElementById(selectedIds[0])
    if (!element || !isShapeElement(element)) return null

    const { x, y, w, h } = element.props
    const handleSize = 8 / ctx.viewport().zoom

    const handles: Array<{ dir: ResizeDirection; px: number; py: number }> = [
      { dir: 'nw', px: x, py: y },
      { dir: 'n', px: x + w / 2, py: y },
      { dir: 'ne', px: x + w, py: y },
      { dir: 'w', px: x, py: y + h / 2 },
      { dir: 'e', px: x + w, py: y + h / 2 },
      { dir: 'sw', px: x, py: y + h },
      { dir: 's', px: x + w / 2, py: y + h },
      { dir: 'se', px: x + w, py: y + h }
    ]

    for (const handle of handles) {
      if (
        Math.abs(point.x - handle.px) <= handleSize &&
        Math.abs(point.y - handle.py) <= handleSize
      ) {
        return { direction: handle.dir, elementId: element.id }
      }
    }

    return null
  }

  const isShapeElement = (el: any): el is ShapeElement => {
    return el && el.props && typeof el.props.x === 'number'
  }

  const renderOverlays = () => (
    <>
      {selectHandler.render()}
      {linkerHandler.render()}
      {resizeHandler.render()}
    </>
  )

  return {
    handlers,
    activeHandler,
    isInteracting,
    getCursor,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    renderOverlays,
    resizeDirection
  }
}

import type { ShapeElement } from '@diagen/core'

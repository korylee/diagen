import type { Point, Rect } from '@diagen/shared'
import type { Viewport, Designer } from '@diagen/core'
import type { ResizeDirection } from '../hooks'
import type { JSX } from 'solid-js'

export type HandlerMode = 'idle' | 'selecting' | 'dragging' | 'linking' | 'resizing' | 'rotating' | 'panning'

export interface HandlerContext {
  store: Designer
  viewport: () => Viewport
  viewportSize: () => { width: number; height: number }
  screenToCanvas: (point: Point) => Point
  canvasToScreen: (point: Point) => Point
  getContainerRect: () => DOMRect | null
}

export interface InteractionHandler {
  name: string
  isActive: () => boolean
  onMouseDown: (e: MouseEvent, point: Point) => void
  onMouseMove: (e: MouseEvent, point: Point) => void
  onMouseUp: (e: MouseEvent, point: Point) => void
  onKeyDown: (e: KeyboardEvent) => void
  render: () => JSX.Element | null
}

export interface HandlerState {
  mode: HandlerMode
  startPoint: Point | null
  currentPoint: Point | null
  targetIds: string[]
  direction: ResizeDirection | null
}

export interface SelectHandlerOptions {
  threshold?: number
  multiSelectKey?: 'ctrl' | 'shift'
}

export interface LinkerHandlerOptions {
  snapDistance?: number
}

export interface ResizeHandlerOptions {
  minWidth?: number
  minHeight?: number
}

import { createMemo, For, Show } from 'solid-js'
import type { Viewport } from '@diagen/core'
import type { Rect, Point } from '@diagen/shared'
import { canvasToScreen, canvasRectToScreen } from '@diagen/core'
import type { ResizeDirection } from '../hooks'

export interface SelectionLayerProps {
  rect: Rect
  viewport: Viewport
}

export function SelectionLayer(props: SelectionLayerProps) {
  const screenRect = () => canvasRectToScreen(props.rect, props.viewport)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenRect().x}px`,
        top: `${screenRect().y}px`,
        width: `${screenRect().w}px`,
        height: `${screenRect().h}px`,
        border: '1px dashed #2196f3',
        'background-color': 'rgba(33, 150, 243, 0.1)',
        'pointer-events': 'none',
        'z-index': 9999
      }}
    />
  )
}

export interface ResizeHandlesProps {
  bounds: Rect
  viewport: Viewport
  onResizeStart: (direction: ResizeDirection, event: MouseEvent) => void
  visible?: boolean
}

const HANDLE_POSITIONS: Array<{ dir: ResizeDirection; x: number; y: number; cursor: string }> = [
  { dir: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { dir: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { dir: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { dir: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
  { dir: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { dir: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { dir: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { dir: 'se', x: 1, y: 1, cursor: 'nwse-resize' }
]

export function ResizeHandles(props: ResizeHandlesProps) {
  const screenBounds = () => canvasRectToScreen(props.bounds, props.viewport)

  const handleMouseDown = (dir: ResizeDirection, e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    props.onResizeStart(dir, e)
  }

  return (
    <Show when={props.visible !== false}>
      <div
        style={{
          position: 'absolute',
          left: `${screenBounds().x - 1}px`,
          top: `${screenBounds().y - 1}px`,
          width: `${screenBounds().w + 2}px`,
          height: `${screenBounds().h + 2}px`,
          border: '2px solid #2196f3',
          'pointer-events': 'none',
          'z-index': 1000
        }}
      >
        <For each={HANDLE_POSITIONS}>
          {(handle) => (
            <div
              style={{
                position: 'absolute',
                left: `${handle.x * 100}%`,
                top: `${handle.y * 100}%`,
                width: '8px',
                height: '8px',
                'background-color': 'white',
                border: '1px solid #2196f3',
                'border-radius': '1px',
                transform: 'translate(-50%, -50%)',
                cursor: handle.cursor,
                'pointer-events': 'auto'
              }}
              onMouseDown={(e) => handleMouseDown(handle.dir, e)}
            />
          )}
        </For>
      </div>
    </Show>
  )
}

export interface RotateHandleProps {
  bounds: Rect
  viewport: Viewport
  onRotateStart: (event: MouseEvent) => void
  visible?: boolean
}

export function RotateHandle(props: RotateHandleProps) {
  const screenBounds = () => canvasRectToScreen(props.bounds, props.viewport)

  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    props.onRotateStart(e)
  }

  return (
    <Show when={props.visible !== false}>
      <>
        <div
          style={{
            position: 'absolute',
            left: `${screenBounds().x + screenBounds().w / 2}px`,
            top: `${screenBounds().y - 25}px`,
            width: '12px',
            height: '12px',
            'background-color': 'white',
            border: '1px solid #2196f3',
            'border-radius': '50%',
            transform: 'translateX(-50%)',
            cursor: 'grab',
            'pointer-events': 'auto',
            'z-index': 1001
          }}
          onMouseDown={handleMouseDown}
        />
        <div
          style={{
            position: 'absolute',
            left: `${screenBounds().x + screenBounds().w / 2}px`,
            top: `${screenBounds().y - 20}px`,
            width: '1px',
            height: '15px',
            'background-color': '#2196f3',
            transform: 'translateX(-50%)',
            'pointer-events': 'none',
            'z-index': 1000
          }}
        />
      </>
    </Show>
  )
}

export interface AnchorPreviewProps {
  elementId: string
  viewport: Viewport
  getElement: (id: string) => { props: { x: number; y: number; w: number; h: number } } | undefined
  getAnchors: (id: string) => Array<{ x: number | string; y: number | string; id?: string }>
  highlightAnchor?: string
}

export function AnchorPreview(props: AnchorPreviewProps) {
  const element = () => props.getElement(props.elementId)
  const anchors = () => props.getAnchors(props.elementId)

  const getAnchorPosition = (anchor: { x: number | string; y: number | string }): Point => {
    const el = element()
    if (!el) return { x: 0, y: 0 }

    const w = el.props.w
    const h = el.props.h
    const x = typeof anchor.x === 'number' ? anchor.x : w * 0.5
    const y = typeof anchor.y === 'number' ? anchor.y : h * 0.5

    return {
      x: el.props.x + x,
      y: el.props.y + y
    }
  }

  return (
    <For each={anchors()}>
      {(anchor) => {
        const pos = getAnchorPosition(anchor)
        const screenPos = canvasToScreen(pos, props.viewport)
        const isHighlight = anchor.id === props.highlightAnchor

        return (
          <div
            style={{
              position: 'absolute',
              left: `${screenPos.x - 5}px`,
              top: `${screenPos.y - 5}px`,
              width: '10px',
              height: '10px',
              'border-radius': '50%',
              background: isHighlight ? '#2196f3' : '#fff',
              border: `2px solid #2196f3`,
              cursor: 'crosshair',
              'z-index': 9998
            }}
          />
        )
      }}
    </For>
  )
}

export interface LinkerPreviewProps {
  from: Point
  to: Point
  viewport: Viewport
  hasTarget?: boolean
}

export function LinkerPreview(props: LinkerPreviewProps) {
  const fromScreen = () => canvasToScreen(props.from, props.viewport)
  const toScreen = () => canvasToScreen(props.to, props.viewport)

  return (
    <svg
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': 9997
      }}
    >
      <line
        x1={fromScreen().x}
        y1={fromScreen().y}
        x2={toScreen().x}
        y2={toScreen().y}
        stroke={props.hasTarget ? '#2196f3' : '#999'}
        stroke-width={2}
        stroke-dasharray={props.hasTarget ? 'none' : '5,5'}
      />
    </svg>
  )
}

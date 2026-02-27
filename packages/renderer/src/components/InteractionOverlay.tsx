import { createMemo, For, Show } from 'solid-js'
import { canvasRectToScreen, canvasToScreen, isShape } from '@diagen/core'
import type { Point, Rect } from '@diagen/shared'
import type { ResizeDirection } from '../hooks'
import { useDesigner } from './DesignerProvider'

// ============================================================================
// 常量
// ============================================================================

const HANDLE_POSITIONS = [
  { dir: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { dir: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { dir: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { dir: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
  { dir: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { dir: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { dir: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { dir: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
] as const

// ============================================================================
// 框选层 - 用于显示框选区域
// ============================================================================

export function SelectionLayer(props: { rect: Rect }) {
  const designer = useDesigner()
  const screenRect = () => canvasRectToScreen(props.rect, designer.view.viewport())

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
        'z-index': 9999,
      }}
    />
  )
}

// ============================================================================
// 选中框 + 调整手柄 + 旋转手柄 - 统一组件
// ============================================================================

export interface SelectionBoxProps {
  onResizeStart?: (direction: ResizeDirection, event: MouseEvent) => void
  onRotateStart?: (event: MouseEvent) => void
  showRotateHandle?: boolean
}

export function SelectionBox(props: SelectionBoxProps) {
  const designer = useDesigner()
  const { selection, element } = designer

  const screenBounds = createMemo(() => {
    const bounds = selection.getSelectionBounds()
    if (!bounds) return null
    return canvasRectToScreen(bounds, designer.state.viewport)
  })

  return (
    <Show when={screenBounds()}>
      {bounds => (
        <div
          style={{
            position: 'absolute',
            left: `${bounds().x - 1}px`,
            top: `${bounds().y - 1}px`,
            width: `${bounds().w + 2}px`,
            height: `${bounds().h + 2}px`,
            border: '2px solid #2196f3',
            'pointer-events': 'none',
            'z-index': 1000,
          }}
        >
          {/* 调整大小手柄 */}
          <For each={HANDLE_POSITIONS}>
            {handle => (
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
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => {
                  e.stopPropagation()
                  e.preventDefault()
                  props.onResizeStart?.(handle.dir, e)
                }}
              />
            )}
          </For>

          {/* 旋转手柄 */}
          <Show when={props.showRotateHandle ?? true}>
            <>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '-25px',
                  width: '12px',
                  height: '12px',
                  'background-color': 'white',
                  border: '1px solid #2196f3',
                  'border-radius': '50%',
                  transform: 'translateX(-50%)',
                  cursor: 'grab',
                  'pointer-events': 'auto',
                }}
                onMouseDown={e => {
                  e.stopPropagation()
                  props.onRotateStart?.(e)
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '-20px',
                  width: '1px',
                  height: '15px',
                  'background-color': '#2196f3',
                  transform: 'translateX(-50%)',
                }}
              />
            </>
          </Show>
        </div>
      )}
    </Show>
  )
}

// ============================================================================
// 锚点预览 - 连线时显示元素的锚点
// ============================================================================

export function AnchorPreview(props: { elementId: string; highlightAnchor?: string }) {
  const designer = useDesigner()

  const element = () => designer.element.getById(props.elementId)
  const anchors = () => [
    { x: 0.5, y: 0, id: 'top' },
    { x: 1, y: 0.5, id: 'right' },
    { x: 0.5, y: 1, id: 'bottom' },
    { x: 0, y: 0.5, id: 'left' },
  ]

  const getAnchorPosition = (anchor: { x: number; y: number }): Point => {
    const el = element()
    if (!el || !isShape(el)) return { x: 0, y: 0 }
    return {
      x: el.props.x + el.props.w * anchor.x,
      y: el.props.y + el.props.h * anchor.y,
    }
  }

  return (
    <For each={anchors()}>
      {(anchor: { x: number; y: number; id: string }) => {
        const pos = getAnchorPosition(anchor)
        const screenPos = canvasToScreen(pos, designer.state.viewport)
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
              border: '2px solid #2196f3',
              cursor: 'crosshair',
              'z-index': 9998,
            }}
          />
        )
      }}
    </For>
  )
}

// ============================================================================
// 连线预览 - 拖动连线时显示预览线
// ============================================================================
export function LinkerPreview(props: { from: Point; to: Point; hasTarget?: boolean }) {
  const designer = useDesigner()
  const fromScreen = () => canvasToScreen(props.from, designer.state.viewport)
  const toScreen = () => canvasToScreen(props.to, designer.state.viewport)

  return (
    <svg
      style={{
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': 9997,
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

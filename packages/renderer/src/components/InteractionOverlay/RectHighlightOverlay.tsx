import { createMemo, For, Show } from 'solid-js'
import type { Bounds } from '@diagen/shared'

export interface RectHighlightItem {
  id: string
  bounds: Bounds
  border?: string
  background?: string
  boxShadow?: string
  opacity?: number
  inset?: number
  radius?: number
  dataAttrs?: Record<string, string | undefined>
}

export interface RectHighlightOverlayProps {
  items: RectHighlightItem[]
  visible?: boolean
  zIndex?: number
}

function resolveRectHighlightBounds(bounds: Bounds, inset = 0): Bounds {
  return {
    x: bounds.x + inset,
    y: bounds.y + inset,
    w: Math.max(0, bounds.w - inset * 2),
    h: Math.max(0, bounds.h - inset * 2),
  }
}

/**
 * 通用矩形高亮层：
 * - 只负责渲染屏幕坐标系下的矩形高亮
 * - 上层可自行决定来源是 bounds、shapeId 或其他语义对象
 */
export function RectHighlightOverlay(props: RectHighlightOverlayProps) {
  const shouldRender = createMemo(() => {
    return (props.visible ?? true) && props.items.length > 0
  })

  return (
    <Show when={shouldRender()}>
      <div
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          'pointer-events': 'none',
          'z-index': props.zIndex ?? 999,
        }}
      >
        <For each={props.items}>
          {item => {
            const bounds = resolveRectHighlightBounds(item.bounds, item.inset)
            return (
              <div
                {...(item.dataAttrs ?? {})}
                style={{
                  position: 'absolute',
                  left: `${bounds.x}px`,
                  top: `${bounds.y}px`,
                  width: `${bounds.w}px`,
                  height: `${bounds.h}px`,
                  border: item.border ?? 'none',
                  'background-color': item.background ?? 'transparent',
                  'box-shadow': item.boxShadow,
                  opacity: item.opacity,
                  'border-radius': item.radius ? `${item.radius}px` : undefined,
                  'box-sizing': 'border-box',
                  'pointer-events': 'none',
                }}
              />
            )
          }}
        </For>
      </div>
    </Show>
  )
}

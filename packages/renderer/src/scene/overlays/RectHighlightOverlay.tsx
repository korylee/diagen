import { expandBounds, type Bounds } from '@diagen/shared'
import { For, Show } from 'solid-js'

export interface RectHighlightItem {
  id: string
  bounds: Bounds
  border?: string
  background?: string
  boxShadow?: string
  opacity?: number
  padding?: number
  radius?: number
  dataAttrs?: Record<string, string | undefined>
}

export interface RectHighlightOverlayProps {
  items: RectHighlightItem[]
  visible?: boolean
  zIndex?: number
}

/**
 * 通用矩形高亮层：
 * - 只负责渲染屏幕坐标系下的矩形高亮
 * - 上层可自行决定来源是 bounds、shapeId 或其他语义对象
 */
export function RectHighlightOverlay(props: RectHighlightOverlayProps) {
  return (
    <Show when={(props.visible ?? true) && props.items.length > 0}>
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
            const bounds = item.padding ? expandBounds(item.bounds, item.padding!) : item.bounds
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
